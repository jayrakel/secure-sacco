package com.jaytechwave.sacco.modules.shares.api.controller;

import com.jaytechwave.sacco.modules.shares.domain.entity.ShareAccount;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareTransaction;
import com.jaytechwave.sacco.modules.shares.domain.service.ShareService;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
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
    private final MemberRepository memberRepository;

    @GetMapping("/me/shares")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<List<com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareAccountDTO>> getMyShares(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        Member member = memberRepository.findByUserId(userDetails.getId()).orElse(null);
        if (member == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        return ResponseEntity.ok(shareService.getMemberAccounts(member.getId()));
    }

    @GetMapping("/me/shares/{accountId}/transactions")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<List<com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareTransactionDTO>> getMyShareTransactions(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID accountId) {
        
        Member member = memberRepository.findByUserId(userDetails.getId()).orElse(null);
        if (member == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Basic security check: ensure account belongs to member
        List<com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareAccountDTO> accounts = shareService.getMemberAccounts(member.getId());
        if (accounts.stream().noneMatch(a -> a.id().equals(accountId))) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(shareService.getAccountTransactions(accountId));
    }
    
    @GetMapping("/admin/shares")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT') or hasAuthority('REPORTS_VIEW')")
    public ResponseEntity<List<com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.AdminShareAccountDTO>> getAllShares() {
        return ResponseEntity.ok(shareService.getAllAccounts());
    }

    @GetMapping("/admin/shares/{accountId}/transactions")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT') or hasAuthority('REPORTS_VIEW')")
    public ResponseEntity<List<com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareTransactionDTO>> getAdminShareTransactions(
            @PathVariable UUID accountId) {
        return ResponseEntity.ok(shareService.getAccountTransactions(accountId));
    }
}
