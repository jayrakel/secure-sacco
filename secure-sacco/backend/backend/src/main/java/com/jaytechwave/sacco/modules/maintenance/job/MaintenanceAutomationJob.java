package com.jaytechwave.sacco.modules.maintenance.job;

import com.jaytechwave.sacco.modules.core.notifications.EmailNotificationService;
import com.jaytechwave.sacco.modules.core.notifications.SmsNotificationService;
import com.jaytechwave.sacco.modules.maintenance.domain.entity.SystemMaintenance;
import com.jaytechwave.sacco.modules.maintenance.domain.repository.SystemMaintenanceRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MaintenanceAutomationJob {

    private final SystemMaintenanceRepository maintenanceRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final EmailNotificationService emailService;
    private final SmsNotificationService smsService;

    // Run every 15 minutes
    @Scheduled(cron = "0 0/15 * * * ?")
    @Transactional
    public void processMaintenanceAutomations() {
        processMemberNotifications();
        processAdminReminders();
    }

    private void processMemberNotifications() {
        List<SystemMaintenance> pending = maintenanceRepository.findPendingMemberNotifications();
        
        if (pending.isEmpty()) {
            return;
        }

        List<Member> activeMembers = memberRepository.findByStatus(MemberStatus.ACTIVE);
        
        for (SystemMaintenance maintenance : pending) {
            log.info("Sending broadcast for maintenance: {}", maintenance.getTitle());
            
            String smsBody = String.format("Alert: %s scheduled from %s to %s. See portal for details.", 
                    maintenance.getTitle(),
                    formatDate(maintenance.getMaintenanceStartTime()),
                    formatDate(maintenance.getMaintenanceEndTime()));

            for (Member member : activeMembers) {
                if (maintenance.isNotifyMembersEmail() && member.getEmail() != null) {
                    emailService.sendSystemAlertEmail(member.getEmail(), maintenance.getTitle(), maintenance.getDescription());
                }
                
                if (maintenance.isNotifyMembersSms() && member.getPhoneNumber() != null) {
                    smsService.sendNotificationSms(member.getPhoneNumber(), smsBody);
                }
            }
            
            maintenance.setMembersNotified(true);
            maintenanceRepository.save(maintenance);
        }
    }

    private void processAdminReminders() {
        // Remind admins if maintenance is within the next 2 hours
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime limit = now.plusHours(2);
        
        List<SystemMaintenance> pending = maintenanceRepository.findPendingAdminReminders(now, limit);
        
        if (pending.isEmpty()) {
            return;
        }

        // We assume SYSTEM_ADMIN role users need to be notified
        // Finding admins via user table / roles
        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRoles() != null && u.getRoles().stream().anyMatch(r -> "SYSTEM_ADMIN".equals(r.getName())))
                .toList();

        for (SystemMaintenance maintenance : pending) {
            log.info("Sending admin reminder for upcoming maintenance: {}", maintenance.getTitle());
            
            String reminderMsg = String.format("REMINDER: Scheduled maintenance '%s' starts at %s. Please prepare the system.",
                    maintenance.getTitle(), formatDate(maintenance.getMaintenanceStartTime()));
            
            for (User admin : admins) {
                if (admin.getEmail() != null) {
                    emailService.sendSystemAlertEmail(admin.getEmail(), "MAINTENANCE REMINDER: " + maintenance.getTitle(), reminderMsg);
                }
                // Optional: Admin SMS if phone is available on User
            }
            
            maintenance.setAdminReminded(true);
            maintenanceRepository.save(maintenance);
        }
    }
    
    private String formatDate(LocalDateTime date) {
        return date.format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm"));
    }
}
