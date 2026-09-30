package com.jaytechwave.sacco.modules.users.domain.service;

import com.jaytechwave.sacco.modules.users.api.dto.NotificationPreferenceDto;
import com.jaytechwave.sacco.modules.users.domain.entity.NotificationPreference;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.NotificationPreferenceRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository notificationPreferenceRepository;
    private final UserRepository userRepository;

    @Transactional
    public NotificationPreferenceDto getPreferences(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        NotificationPreference pref = notificationPreferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> createDefaultPreferences(user));
                
        return mapToDto(pref);
    }
    
    @Transactional
    public NotificationPreference getPreferencesEntity(User user) {
        return notificationPreferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> createDefaultPreferences(user));
    }

    @Transactional
    public NotificationPreferenceDto updatePreferences(String email, NotificationPreferenceDto dto) {
        User user = userRepository.findByEmail(email).orElseThrow();
        NotificationPreference pref = notificationPreferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> createDefaultPreferences(user));

        pref.setEmailEnabled(dto.emailEnabled());
        pref.setSmsEnabled(dto.smsEnabled());
        pref.setNotifyOnGuarantorRequests(dto.notifyOnGuarantorRequests());
        pref.setNotifyOnLoanUpdates(dto.notifyOnLoanUpdates());
        pref.setNotifyOnTransactions(dto.notifyOnTransactions());

        pref = notificationPreferenceRepository.save(pref);
        return mapToDto(pref);
    }
    
    public boolean shouldSendEmailForGuarantorRequest(User user) {
        NotificationPreference pref = getPreferencesEntity(user);
        return pref.isEmailEnabled() && pref.isNotifyOnGuarantorRequests();
    }
    
    public boolean shouldSendSmsForGuarantorRequest(User user) {
        NotificationPreference pref = getPreferencesEntity(user);
        return pref.isSmsEnabled() && pref.isNotifyOnGuarantorRequests();
    }

    private NotificationPreference createDefaultPreferences(User user) {
        NotificationPreference pref = NotificationPreference.builder()
                .user(user)
                .emailEnabled(true)
                .smsEnabled(true)
                .notifyOnGuarantorRequests(true)
                .notifyOnLoanUpdates(true)
                .notifyOnTransactions(true)
                .build();
        return notificationPreferenceRepository.save(pref);
    }

    private NotificationPreferenceDto mapToDto(NotificationPreference pref) {
        return new NotificationPreferenceDto(
                pref.isEmailEnabled(),
                pref.isSmsEnabled(),
                pref.isNotifyOnGuarantorRequests(),
                pref.isNotifyOnLoanUpdates(),
                pref.isNotifyOnTransactions()
        );
    }
}
