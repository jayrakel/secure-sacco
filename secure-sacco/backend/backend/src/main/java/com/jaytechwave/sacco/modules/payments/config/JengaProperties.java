package com.jaytechwave.sacco.modules.payments.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "sacco.jenga")
public class JengaProperties {
    private String merchantCode;
    private String consumerKey;
    private String consumerSecret;
    private String privateKey;
    private String baseUrl;
    private String callbackBaseUrl;
}
