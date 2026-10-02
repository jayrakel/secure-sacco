package com.jaytechwave.sacco.modules.core.security.webauthn;

import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;

@Configuration
public class WebAuthnConfig {

    @Bean
    public RelyingParty relyingParty(WebAuthnCredentialRepositoryImpl credentialRepository) {
        RelyingPartyIdentity rpIdentity = RelyingPartyIdentity.builder()
                .id("localhost") // In production, this should be the actual domain, e.g. jaytechwavesolutions.co.ke
                .name("Betterlink Ventures Sacco")
                .build();

        return RelyingParty.builder()
                .identity(rpIdentity)
                .credentialRepository(credentialRepository)
                .origins(Set.of("http://localhost:5173", "https://localhost:5173")) // Also should be configurable in prod
                .build();
    }
}
