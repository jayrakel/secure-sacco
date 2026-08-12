package com.jaytechwave.sacco.modules.core.notifications.domain.repository;

import com.jaytechwave.sacco.modules.core.notifications.domain.entity.SmsLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SmsLogRepository extends JpaRepository<SmsLog, UUID> {
    Page<SmsLog> findByStatus(SmsLog.SmsLogStatus status, Pageable pageable);
    Page<SmsLog> findByPhoneNumberContaining(String phoneNumber, Pageable pageable);
    Page<SmsLog> findByStatusAndPhoneNumberContaining(SmsLog.SmsLogStatus status, String phoneNumber, Pageable pageable);
}
