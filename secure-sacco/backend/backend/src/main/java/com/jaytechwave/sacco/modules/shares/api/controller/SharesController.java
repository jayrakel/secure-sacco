package com.jaytechwave.sacco.modules.shares.api.controller;

import com.jaytechwave.sacco.modules.shares.domain.entity.ShareAccount;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareTransaction;
import com.jaytechwave.sacco.modules.shares.domain.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService.CustomUserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SharesController {

    private final ShareService shareService;

    @GetMapping("/me/shares")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<List<ShareAccount>> getMyShares(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(shareService.getMemberAccounts(userDetails.getId()));
    }

    @GetMapping("/me/shares/{accountId}/transactions")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<List<ShareTransaction>> getMyShareTransactions(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID accountId) {
        // Basic security check: ensure account belongs to member
        List<ShareAccount> accounts = shareService.getMemberAccounts(userDetails.getId());
        if (accounts.stream().noneMatch(a -> a.getId().equals(accountId))) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(shareService.getAccountTransactions(accountId));
    }
}
