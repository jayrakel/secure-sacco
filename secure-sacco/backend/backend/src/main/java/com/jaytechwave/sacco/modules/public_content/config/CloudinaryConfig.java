package com.jaytechwave.sacco.modules.public_content.config;

import com.cloudinary.Cloudinary;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class CloudinaryConfig {

    @Value("${CLOUDINARY_URL:}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinary() {
        if (cloudinaryUrl == null || cloudinaryUrl.isBlank()) {
            log.warn("CLOUDINARY_URL is not set — Cloudinary bean will not be created.");
            return null;
        }
        log.info("Cloudinary configured from CLOUDINARY_URL.");
        return new Cloudinary(cloudinaryUrl);
    }
}
