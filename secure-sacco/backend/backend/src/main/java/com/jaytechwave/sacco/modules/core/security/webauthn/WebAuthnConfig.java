package com.jaytechwave.sacco.modules.core.security.webauthn;

import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;

@Configuration
public class WebAuthnConfig {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${sacco.security.webauthn.rp-name:Betterlink Ventures Sacco}")
    private String rpName;

    @Value("${sacco.security.cors.allowed-origins:http://localhost:5173}")
    private String[] allowedOrigins;

    @Bean
    public RelyingParty relyingParty(WebAuthnCredentialRepositoryImpl credentialRepository) throws java.net.MalformedURLException {
        String rpId = new java.net.URL(frontendUrl).getHost();

        RelyingPartyIdentity rpIdentity = RelyingPartyIdentity.builder()
                .id(rpId) 
                .name(rpName)
                .build();

        return RelyingParty.builder()
                .identity(rpIdentity)
                .credentialRepository(credentialRepository)
                .origins(Set.of(allowedOrigins)) 
                .build();
    }
}
