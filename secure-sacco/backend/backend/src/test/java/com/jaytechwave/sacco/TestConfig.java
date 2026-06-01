package com.jaytechwave.sacco;

import com.cloudinary.Cloudinary;
import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/**
 * Provides mock beans for external services that require API credentials
 * and are not available in the CI test environment.
 *
 * Cloudinary: used for logo/image uploads in settings. The CI Maven cache
 * may contain cloudinary-core jars from transitive deps; this mock prevents
 * context load failures in @SpringBootTest.
 */
@TestConfiguration
public class TestConfig {

    @Bean
    public Cloudinary cloudinary() {
        return Mockito.mock(Cloudinary.class);
    }
}