package com.jaytechwave.sacco.modules.members.api.controller;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.*;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.service.MemberService;
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
public class MemberController {

    private final MemberService memberService;
    private final SecurityAuditService auditService;

    @PostMapping
    @PreAuthorize("hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<MemberResponse> createMember(@Valid @RequestBody CreateMemberRequest request, Authentication auth, HttpServletRequest httpRequest) {
        MemberResponse response = memberService.createMember(request);
        auditService.logEventWithActorAndIp(auth.getName(), "MEMBER_CREATED", "Members", getClientIP(httpRequest), "Created member: " + response.getMemberNumber());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('MEMBERS_READ') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Page<MemberResponse>> getMembers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) MemberStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(memberService.getMembers(q, status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('MEMBERS_READ') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<MemberResponse> getMember(@PathVariable UUID id) {
        return ResponseEntity.ok(memberService.getMemberById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<MemberResponse> updateMember(@PathVariable UUID id, @Valid @RequestBody UpdateMemberRequest request, Authentication auth, HttpServletRequest httpRequest) {
        MemberResponse response = memberService.updateMember(id, request);
        auditService.logEventWithActorAndIp(auth.getName(), "MEMBER_UPDATED", "Members", getClientIP(httpRequest), "Updated member: " + response.getMemberNumber());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<MemberResponse> updateStatus(@PathVariable UUID id, @RequestBody UpdateStatusRequest request, Authentication auth, HttpServletRequest httpRequest) {
        MemberResponse response = memberService.updateStatus(id, request.getStatus());
        auditService.logEventWithActorAndIp(auth.getName(), "MEMBER_STATUS_CHANGED", "Members", getClientIP(httpRequest), "Changed status of " + response.getMemberNumber() + " to " + request.getStatus());
        return ResponseEntity.ok(response);
    }

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