package com.jaytechwave.sacco.modules.payments.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "safaricom.daraja")
public class DarajaProperties {
    private String env;
    private String consumerKey;
    private String consumerSecret;
    private String passkey;
    private String shortcode;
    private String b2cShortcode;
    private String callbackBaseUrl;
    private Endpoints endpoints = new Endpoints();

    @Data
    public static class Endpoints {
        private String mpesaExpressCallback;
        private String c2bValidation;
        private String c2bConfirmation;
        private String b2cResult;
        private String b2cQueueTimeout;
    }
}