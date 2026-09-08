package com.jaytechwave.sacco.modules.maintenance.domain.repository;

import com.jaytechwave.sacco.modules.maintenance.domain.entity.SystemMaintenance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SystemMaintenanceRepository extends JpaRepository<SystemMaintenance, UUID> {

    @Query("SELECT s FROM SystemMaintenance s WHERE s.notifyMembersApp = true AND s.maintenanceEndTime > :now ORDER BY s.maintenanceStartTime ASC")
    List<SystemMaintenance> findActiveOrUpcomingForApp(@Param("now") LocalDateTime now);

    @Query("SELECT s FROM SystemMaintenance s WHERE s.membersNotified = false AND (s.notifyMembersSms = true OR s.notifyMembersEmail = true)")
    List<SystemMaintenance> findPendingMemberNotifications();

    @Query("SELECT s FROM SystemMaintenance s WHERE s.adminReminded = false AND s.maintenanceStartTime BETWEEN :now AND :limit")
    List<SystemMaintenance> findPendingAdminReminders(@Param("now") LocalDateTime now, @Param("limit") LocalDateTime limit);
}
