package com.jaytechwave.sacco.modules.dividends.api.controller;

import com.jaytechwave.sacco.modules.dividends.api.dto.DividendDTOs.DeclareDividendRequest;
import com.jaytechwave.sacco.modules.dividends.domain.entity.DividendDeclaration;
import com.jaytechwave.sacco.modules.dividends.domain.service.DividendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/dividends")
@RequiredArgsConstructor
public class DividendController {

    private final DividendService dividendService;

    @GetMapping
    @PreAuthorize("hasAuthority('DIVIDENDS_READ')")
    public ResponseEntity<List<DividendDeclaration>> getAllDeclarations() {
        return ResponseEntity.ok(dividendService.getAllDeclarations());
    }

    @PostMapping("/declare")
    @PreAuthorize("hasAuthority('DIVIDENDS_MANAGE')")
    public ResponseEntity<DividendDeclaration> declareDividend(
            @RequestBody DeclareDividendRequest request) {
        return ResponseEntity.ok(dividendService.declareDividend(request.getFinancialYear(), request.getRatePercentage()));
    }
}
