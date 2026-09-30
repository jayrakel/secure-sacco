package com.jaytechwave.sacco.modules.users.api.dto;

public record NotificationPreferenceDto(
    boolean emailEnabled,
    boolean smsEnabled,
    boolean notifyOnGuarantorRequests,
    boolean notifyOnLoanUpdates,
    boolean notifyOnTransactions,
    boolean notifyOnSystemAlerts
) {}
