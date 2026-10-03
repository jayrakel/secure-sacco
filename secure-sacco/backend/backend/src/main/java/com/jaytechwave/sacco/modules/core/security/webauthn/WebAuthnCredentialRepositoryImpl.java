package com.jaytechwave.sacco.modules.core.security.webauthn;

import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import com.jaytechwave.sacco.modules.users.domain.entity.Passkey;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.PasskeyRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class WebAuthnCredentialRepositoryImpl implements CredentialRepository {

    private final UserRepository userRepository;
    private final PasskeyRepository passkeyRepository;
    private final PiiSearchHashConverter piiSearchHashConverter;

    private Optional<User> findUser(String identifier) {
        if (identifier == null) return Optional.empty();
        String cleanIdentifier = identifier.trim();
        String normalizedEmail = cleanIdentifier.toLowerCase(java.util.Locale.ROOT);
        String normalizedPhone = com.jaytechwave.sacco.modules.core.utils.PhoneUtils.normalizePhone(cleanIdentifier);
        
        String phoneToHash = normalizedPhone != null ? normalizedPhone : cleanIdentifier;
        String phoneHash = piiSearchHashConverter.convertToDatabaseColumn(phoneToHash);
        
        return userRepository.findByEmailOrPhoneNumberHashOrMemberNumber(normalizedEmail, phoneHash, cleanIdentifier);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
        User user = findUser(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return passkeyRepository.findAllByUserId(user.getId()).stream()
                .map(passkey -> PublicKeyCredentialDescriptor.builder()
                        .id(new ByteArray(passkey.getCredentialId()))
                        .build())
                .collect(Collectors.toSet());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ByteArray> getUserHandleForUsername(String username) {
        return findUser(username)
                .map(user -> new ByteArray(user.getId().toString().getBytes()));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
        try {
            UUID id = UUID.fromString(new String(userHandle.getBytes()));
            return userRepository.findById(id).map(User::getEmail);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
        Optional<Passkey> passkeyOpt = passkeyRepository.findByCredentialId(credentialId.getBytes());
        if (passkeyOpt.isEmpty()) {
            return Optional.empty();
        }
        Passkey passkey = passkeyOpt.get();
        return Optional.of(RegisteredCredential.builder()
                .credentialId(credentialId)
                .userHandle(userHandle)
                .publicKeyCose(new ByteArray(passkey.getPublicKeyCbor()))
                .signatureCount(passkey.getSignatureCount())
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
        Optional<Passkey> passkeyOpt = passkeyRepository.findByCredentialId(credentialId.getBytes());
        if (passkeyOpt.isEmpty()) {
            return Set.of();
        }
        Passkey passkey = passkeyOpt.get();
        return Set.of(RegisteredCredential.builder()
                .credentialId(credentialId)
                .userHandle(new ByteArray(passkey.getUser().getId().toString().getBytes()))
                .publicKeyCose(new ByteArray(passkey.getPublicKeyCbor()))
                .signatureCount(passkey.getSignatureCount())
                .build());
    }
}
