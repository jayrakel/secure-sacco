package com.jaytechwave.sacco.modules.public_content.config;

import com.cloudinary.Cloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class CloudinaryConfig {

    // We pull the URL directly from the environment variable
    @Value("${cloudinary.url:${CLOUDINARY_URL:}}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinary() {
        String url = cloudinaryUrl;
        if (url != null && url.startsWith("CLOUDINARY_URL=")) {
            url = url.substring("CLOUDINARY_URL=".length());
        }
        return new Cloudinary(url);
    }
}