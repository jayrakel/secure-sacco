package com.jaytechwave.sacco.modules.core.security.webauthn;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService.CustomUserDetails;
import com.jaytechwave.sacco.modules.users.domain.entity.Passkey;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.PasskeyRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.yubico.webauthn.exception.AssertionFailedException;
import com.yubico.webauthn.exception.RegistrationFailedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/webauthn")
@RequiredArgsConstructor
@Slf4j
public class WebAuthnController {

    private final RelyingParty relyingParty;
    private final PasskeyRepository passkeyRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService userDetailsService;
    private final com.jaytechwave.sacco.modules.core.service.MfaService mfaService;

    // --- Registration ---

    @PostMapping("/register/options")
    public ResponseEntity<String> startRegistration(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpSession session) throws JsonProcessingException {

        StartRegistrationOptions options = StartRegistrationOptions.builder()
                .user(UserIdentity.builder()
                        .name(userDetails.getUsername())
                        .displayName(userDetails.getFirstName() + " " + userDetails.getLastName())
                        .id(new ByteArray(userDetails.getId().toString().getBytes()))
                        .build())
                .build();

        PublicKeyCredentialCreationOptions creationOptions = relyingParty.startRegistration(options);
        
        session.setAttribute("webauthn_registration_request", creationOptions);

        return ResponseEntity.ok(creationOptions.toCredentialsCreateJson());
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> finishRegistration(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody String credentialJson,
            @RequestParam(defaultValue = "My Passkey") String name,
            HttpSession session) throws IOException, RegistrationFailedException {

        PublicKeyCredentialCreationOptions requestOptions = 
                (PublicKeyCredentialCreationOptions) session.getAttribute("webauthn_registration_request");
        if (requestOptions == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Registration options not found in session"));
        }

        PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> pkc =
                PublicKeyCredential.parseRegistrationResponseJson(credentialJson);

        FinishRegistrationOptions options = FinishRegistrationOptions.builder()
                .request(requestOptions)
                .response(pkc)
                .build();

        RegistrationResult result = relyingParty.finishRegistration(options);

        // Save to DB
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        Passkey passkey = Passkey.builder()
                .user(user)
                .credentialId(result.getKeyId().getId().getBytes())
                .publicKeyCbor(result.getPublicKeyCose().getBytes())
                .signatureCount(result.getSignatureCount())
                .aaguid(result.getAaguid().toString())
                .name(name)
                .build();

        passkeyRepository.save(passkey);

        session.removeAttribute("webauthn_registration_request");

        return ResponseEntity.ok(Map.of("message", "Passkey registered successfully"));
    }

    // --- Login ---

    @PostMapping("/login/options")
    public ResponseEntity<String> startLogin(
            @RequestParam String username,
            HttpSession session) throws JsonProcessingException {
        
        StartAssertionOptions options = StartAssertionOptions.builder()
                .username(username)
                .build();

        AssertionRequest request = relyingParty.startAssertion(options);
        session.setAttribute("webauthn_assertion_request", request);

        return ResponseEntity.ok(request.toCredentialsGetJson());
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> finishLogin(
            @RequestBody String credentialJson,
            HttpSession session,
            HttpServletRequest httpRequest) throws IOException, AssertionFailedException {

        AssertionRequest request = (AssertionRequest) session.getAttribute("webauthn_assertion_request");
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Assertion request not found in session"));
        }

        PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> pkc =
                PublicKeyCredential.parseAssertionResponseJson(credentialJson);

        FinishAssertionOptions options = FinishAssertionOptions.builder()
                .request(request)
                .response(pkc)
                .build();

        AssertionResult result = relyingParty.finishAssertion(options);

        if (result.isSuccess()) {
            Optional<Passkey> passkeyOpt = passkeyRepository.findByCredentialId(result.getCredential().getCredentialId().getBytes());
            if (passkeyOpt.isPresent()) {
                Passkey passkey = passkeyOpt.get();
                passkey.setSignatureCount(result.getSignatureCount());
                passkeyRepository.save(passkey);

                // Authenticate the user
                User user = passkey.getUser();
                CustomUserDetails userDetails = (CustomUserDetails) 
                        userDetailsService.loadUserByUsername(user.getEmail());

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());

                String clientIp = getClientIP(httpRequest);

                if (userDetails.isMfaEnabled()) {
                    mfaService.dispatchMfaCode(user);
                    String mfaToken = mfaService.createPreAuthToken(userDetails.getId());
                    return ResponseEntity.status(202).body(Map.of( // HTTP 202 Accepted
                            "status", "REQUIRES_MFA",
                            "mfaToken", mfaToken,
                            "mfaMethod", user.getMfaMethod().name(),
                            "message", "MFA is required. Please submit your authentication code."
                    ));
                }

                establishSession(httpRequest, authentication);
                
                return ResponseEntity.ok(buildLoginResponse(userDetails));
            }
            return ResponseEntity.status(401).body(Map.of("message", "User not found for passkey"));
        } else {
            return ResponseEntity.status(401).body(Map.of("message", "Login failed"));
        }
    }

    private void establishSession(HttpServletRequest request, org.springframework.security.core.Authentication authentication) {
        org.springframework.security.core.context.SecurityContext securityContext = org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        org.springframework.security.core.context.SecurityContextHolder.setContext(securityContext);
        HttpSession session = request.getSession(true);
        session.setAttribute(org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);
        session.setAttribute("clientIp", getClientIP(request));
        session.setAttribute("userAgent", request.getHeader("User-Agent"));
    }

    private Map<String, Object> buildLoginResponse(CustomUserDetails userDetails) {
        User user = userRepository.findWithMemberByEmail(userDetails.getUsername()).orElseThrow();
        Map<String, Object> res = new java.util.HashMap<>();
        res.put("id", user.getId());
        res.put("email", user.getEmail());
        res.put("firstName", user.getFirstName());
        res.put("lastName", user.getLastName());
        res.put("roles", userDetails.getRoles());
        res.put("requiresMfa", user.isMfaEnabled());
        return res;
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
