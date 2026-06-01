package com.jaytechwave.sacco.modules.public_content.config;

import com.cloudinary.Cloudinary;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.url:${CLOUDINARY_URL:}}")
    private String cloudinaryUrl;

    @Bean
    @ConditionalOnProperty(name = "cloudinary.url", matchIfMissing = false)
    public Cloudinary cloudinary() {
        String url = cloudinaryUrl;
        if (url != null && url.startsWith("CLOUDINARY_URL=")) {
            url = url.substring("CLOUDINARY_URL=".length());
        }
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("CLOUDINARY_URL is required");
        }
        return new Cloudinary(url);
    }
}