package com.jaytechwave.sacco.modules.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityBeansConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2PasswordEncoder(
            16, // salt length (16 bytes)
            32, // hash length (32 bytes)
            4,  // parallelism
            65536, // memory cost (64 MB)
            3   // iterations
        );
    }
}