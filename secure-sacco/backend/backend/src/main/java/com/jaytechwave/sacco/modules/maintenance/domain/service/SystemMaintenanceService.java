package com.jaytechwave.sacco.modules.maintenance.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.maintenance.api.dto.SystemMaintenanceDTOs.CreateMaintenanceRequest;
import com.jaytechwave.sacco.modules.maintenance.api.dto.SystemMaintenanceDTOs.MaintenanceResponse;
import com.jaytechwave.sacco.modules.maintenance.domain.entity.SystemMaintenance;
import com.jaytechwave.sacco.modules.maintenance.domain.repository.SystemMaintenanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemMaintenanceService {

    private final SystemMaintenanceRepository maintenanceRepository;
    private final SecurityAuditService auditService;

    @Transactional
    public MaintenanceResponse createMaintenance(CreateMaintenanceRequest req, String adminUsername, String ipAddress) {
        
        if (req.getMaintenanceEndTime().isBefore(req.getMaintenanceStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }
        
        SystemMaintenance maintenance = SystemMaintenance.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .maintenanceStartTime(req.getMaintenanceStartTime())
                .maintenanceEndTime(req.getMaintenanceEndTime())
                .notifyMembersApp(req.isNotifyMembersApp())
                .notifyMembersSms(req.isNotifyMembersSms())
                .notifyMembersEmail(req.isNotifyMembersEmail())
                .membersNotified(false)
                .adminReminded(false)
                .build();
                
        maintenance = maintenanceRepository.save(maintenance);
        
        auditService.logEventWithActorAndIp(adminUsername, "MAINTENANCE_SCHEDULED", 
                "SystemMaintenance", ipAddress, "Scheduled maintenance: " + req.getTitle());
                
        return mapToResponse(maintenance);
    }
    
    @Transactional(readOnly = true)
    public List<MaintenanceResponse> getAllMaintenance() {
        return maintenanceRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<MaintenanceResponse> getActiveOrUpcomingMaintenance() {
        return maintenanceRepository.findActiveOrUpcomingForApp(LocalDateTime.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    private MaintenanceResponse mapToResponse(SystemMaintenance m) {
        MaintenanceResponse res = new MaintenanceResponse();
        res.setId(m.getId());
        res.setTitle(m.getTitle());
        res.setDescription(m.getDescription());
        res.setMaintenanceStartTime(m.getMaintenanceStartTime());
        res.setMaintenanceEndTime(m.getMaintenanceEndTime());
        res.setNotifyMembersApp(m.isNotifyMembersApp());
        res.setNotifyMembersSms(m.isNotifyMembersSms());
        res.setNotifyMembersEmail(m.isNotifyMembersEmail());
        res.setMembersNotified(m.isMembersNotified());
        res.setAdminReminded(m.isAdminReminded());
        return res;
    }
}
