package com.jaytechwave.sacco.modules.public_content.api.controller;

import com.jaytechwave.sacco.modules.public_content.domain.service.PublicService;
import com.jaytechwave.sacco.modules.public_content.dto.PublicContentDTOs.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
public class PublicController {

    private final PublicService publicService;

    // ── PUBLIC endpoints (no auth) ────────────────────────────────────────

    @GetMapping("/landing")
    public ResponseEntity<LandingPageResponse> getLandingPage() {
        return ResponseEntity.ok(publicService.getLandingPage());
    }

    // ── SECRETARY: announcements ──────────────────────────────────────────

    @GetMapping("/admin/announcements")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<AnnouncementDTO>> listAnnouncements() {
        return ResponseEntity.ok(publicService.getAllAnnouncements());
    }

    @PostMapping("/admin/announcements")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<AnnouncementDTO> createAnnouncement(
            @RequestBody AnnouncementRequest req, Principal principal) {
        return ResponseEntity.ok(publicService.createAnnouncement(req, principal.getName()));
    }

    @PutMapping("/admin/announcements/{id}")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<AnnouncementDTO> updateAnnouncement(
            @PathVariable UUID id, @RequestBody AnnouncementRequest req) {
        return ResponseEntity.ok(publicService.updateAnnouncement(id, req));
    }

    @PatchMapping("/admin/announcements/{id}/toggle")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Void> toggleAnnouncement(@PathVariable UUID id) {
        publicService.toggleAnnouncement(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/admin/announcements/{id}")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Void> deleteAnnouncement(@PathVariable UUID id) {
        publicService.deleteAnnouncement(id);
        return ResponseEntity.noContent().build();
    }

    // ── SECRETARY: documents ──────────────────────────────────────────────

    @GetMapping("/admin/documents")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<DocumentDTO>> listDocuments() {
        return ResponseEntity.ok(publicService.getAllDocuments());
    }

    @PostMapping("/admin/documents")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<DocumentDTO> createDocument(
            @RequestBody DocumentRequest req, Principal principal) {
        return ResponseEntity.ok(publicService.createDocument(req, principal.getName()));
    }

    @PutMapping("/admin/documents/{id}")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<DocumentDTO> updateDocument(
            @PathVariable UUID id, @RequestBody DocumentRequest req) {
        return ResponseEntity.ok(publicService.updateDocument(id, req));
    }

    @PatchMapping("/admin/documents/{id}/toggle")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Void> toggleDocument(@PathVariable UUID id) {
        publicService.toggleDocument(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/admin/documents/{id}")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) {
        publicService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    // ── SECRETARY: update public profile ──────────────────────────────────

    @PutMapping("/admin/profile")
    @PreAuthorize("hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Void> updateProfile(@RequestBody PublicProfileRequest req) {
        publicService.updatePublicProfile(req);
        return ResponseEntity.noContent().build();
    }
}