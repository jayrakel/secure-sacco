package com.jaytechwave.sacco.modules.core.notifications.api.dto;

import lombok.Data;
import java.util.List;

@Data
public class SendBulkSmsRequest {
    private List<String> phoneNumbers;
    private String message;
}
