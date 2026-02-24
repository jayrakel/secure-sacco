package com.jaytechwave.sacco.modules.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityBeansConfig {

    @Value("${app.security.password.argon2.salt-length:16}")
    private int saltLength;

    @Value("${app.security.password.argon2.hash-length:32}")
    private int hashLength;

    @Value("${app.security.password.argon2.parallelism:1}")
    private int parallelism;

    @Value("${app.security.password.argon2.memory:65536}")
    private int memory;

    @Value("${app.security.password.argon2.iterations:3}")
    private int iterations;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2PasswordEncoder(
                saltLength,
                hashLength,
                parallelism,
                memory,
                iterations
        );
    }
}