package com.jaytechwave.sacco.modules.members.api.controller;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.*;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
@Tag(name = "Members", description = "Member registration, KYC, status management")
public class MemberController {

    private final MemberService memberService;
    private final SecurityAuditService auditService;

    @Operation(summary = "Create member", description = "Register a new SACCO member. Requires MEMBERS_WRITE.")
    @PostMapping
    @PreAuthorize("hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<MemberResponse> createMember(@Valid @RequestBody CreateMemberRequest request, Authentication auth, HttpServletRequest httpRequest) {
        MemberResponse response = memberService.createMember(request);
        auditService.logEventWithActorAndIp(auth.getName(), "MEMBER_CREATED", "Members", getClientIP(httpRequest), "Created member: " + response.getMemberNumber());
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "List members", description = "Paginated member list with optional search and status filter.")
    @GetMapping
    @PreAuthorize("hasAuthority('MEMBERS_READ') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Page<MemberResponse>> getMembers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) MemberStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(memberService.getMembers(q, status, pageable));
    }

    @Operation(summary = "Get member by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('MEMBERS_READ') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<MemberResponse> getMember(@PathVariable UUID id) {
        return ResponseEntity.ok(memberService.getMemberById(id));
    }

    @Operation(summary = "Update member details")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<MemberResponse> updateMember(@PathVariable UUID id, @Valid @RequestBody UpdateMemberRequest request, Authentication auth, HttpServletRequest httpRequest) {
        MemberResponse response = memberService.updateMember(id, request);
        auditService.logEventWithActorAndIp(auth.getName(), "MEMBER_UPDATED", "Members", getClientIP(httpRequest), "Updated member: " + response.getMemberNumber());
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Change member status", description = "Activate, suspend, or close a member account.")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<MemberResponse> updateStatus(@PathVariable UUID id, @RequestBody UpdateStatusRequest request, Authentication auth, HttpServletRequest httpRequest) {
        MemberResponse response = memberService.updateStatus(id, request.getStatus());
        auditService.logEventWithActorAndIp(auth.getName(), "MEMBER_STATUS_CHANGED", "Members", getClientIP(httpRequest), "Changed status of " + response.getMemberNumber() + " to " + request.getStatus());
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Delete member", description = "Soft-deletes a member record.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Void> deleteMember(@PathVariable UUID id, Authentication auth, HttpServletRequest httpRequest) {
        memberService.softDeleteMember(id);
        auditService.logEventWithActorAndIp(auth.getName(), "MEMBER_DELETED", "Members", getClientIP(httpRequest), "Soft deleted member ID: " + id);
        return ResponseEntity.noContent().build();
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}