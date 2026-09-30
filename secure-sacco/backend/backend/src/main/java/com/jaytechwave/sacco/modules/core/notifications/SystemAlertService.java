package com.jaytechwave.sacco.modules.core.notifications;

import com.jaytechwave.sacco.modules.core.notifications.api.dto.SystemAlertDTOs.SystemAlertRequest;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemAlertService {

    private final UserRepository userRepository;
    private final SmsNotificationService smsNotificationService;

    public void dispatchAlert(SystemAlertRequest request) {
        log.info("Received system alert from source={}, service={}, severity={}: {}",
                request.getSource(), request.getService(), request.getSeverity(), request.getMessage());

        // Only SMS on ERROR or CRITICAL
        if (!"CRITICAL".equalsIgnoreCase(request.getSeverity()) && !"ERROR".equalsIgnoreCase(request.getSeverity())) {
            log.debug("Severity is {}, skipping SMS dispatch.", request.getSeverity());
            return;
        }

        List<User> developers = userRepository.findAllByRolesNameInAndIsDeletedFalse(List.of("DEVELOPER"));
        
        if (developers.isEmpty()) {
            log.warn("No active users found with DEVELOPER role. Cannot dispatch SMS alert.");
            return;
        }

        String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"));
        
        String smsMessage = String.format(
                "%s SYSTEM ALERT\n\nSACCO System\nService: %s\nTime: %s\n\n%s\n\nPlease investigate immediately.",
                request.getSeverity().toUpperCase(),
                request.getService(),
                time,
                request.getMessage()
        );

        for (User developer : developers) {
            String phone = developer.getPhoneNumber();
            if (phone != null && !phone.isBlank()) {
                log.info("Dispatching system alert SMS to developer: {}", developer.getEmail());
                smsNotificationService.sendNotificationSms(phone, smsMessage);
            }
        }
    }
}
