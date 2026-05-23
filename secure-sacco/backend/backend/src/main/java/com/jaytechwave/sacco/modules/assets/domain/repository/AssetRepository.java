package com.jaytechwave.sacco.modules.assets.domain.repository;

import com.jaytechwave.sacco.modules.assets.domain.entity.AssetStatus;
import com.jaytechwave.sacco.modules.assets.domain.entity.SaccoAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssetRepository extends JpaRepository<SaccoAsset, UUID> {

    List<SaccoAsset> findAllByOrderByCreatedAtDesc();

    List<SaccoAsset> findByStatusOrderByCreatedAtDesc(AssetStatus status);

    boolean existsByJournalReference(String journalReference);
}
