package com.jaytechwave.sacco.modules.reports.domain.repository;

import com.jaytechwave.sacco.modules.reports.domain.entity.MemberFinancialOverview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MemberFinancialOverviewRepository extends JpaRepository<MemberFinancialOverview, UUID> {
    // Out of the box, findAll() will execute blazing fast due to the underlying views!
}