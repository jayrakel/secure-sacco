package com.jaytechwave.sacco.modules.core.notifications.api.dto;

import lombok.Data;

@Data
public class SendSmsRequest {
    private String phoneNumber;
    private String message;
}
