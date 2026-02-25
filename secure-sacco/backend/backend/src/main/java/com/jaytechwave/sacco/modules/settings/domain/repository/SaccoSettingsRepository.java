package com.jaytechwave.sacco.modules.settings.domain.repository;

import com.jaytechwave.sacco.modules.settings.domain.entity.SaccoSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SaccoSettingsRepository extends JpaRepository<SaccoSettings, UUID> {
}