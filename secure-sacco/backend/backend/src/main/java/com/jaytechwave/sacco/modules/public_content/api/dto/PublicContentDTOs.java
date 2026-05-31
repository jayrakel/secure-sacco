package com.jaytechwave.sacco.modules.public_content.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class PublicContentDTOs {

    // ── Landing page full response ─────────────────────────────────────────
    public record LandingPageResponse(
            SaccoProfileDTO    profile,
            List<AnnouncementDTO> announcements,
            List<DocumentDTO>    documents,
            List<UpcomingMeetingDTO> upcomingMeetings,
            long memberCount,
            long meetingsHeld,
            long totalDocuments
    ) {}

    // ── SACCO public profile ───────────────────────────────────────────────
    public record SaccoProfileDTO(
            String saccoName,
            String tagline,
            String history,
            String mission,
            String vision,
            Integer foundedYear,
            String logoUrl,
            String contactPhone,
            String contactEmail,
            String contactAddress
    ) {}

    // ── Announcement ──────────────────────────────────────────────────────
    public record AnnouncementDTO(
            UUID   id,
            String title,
            String body,
            boolean isPinned,
            LocalDateTime createdAt
    ) {}

    // ── Document ──────────────────────────────────────────────────────────
    public record DocumentDTO(
            UUID      id,
            String    title,
            String    description,
            String    category,
            String    fileUrl,
            String    fileName,
            LocalDate meetingDate,
            LocalDateTime createdAt
    ) {}

    // ── Upcoming meeting (public view) ────────────────────────────────────
    public record UpcomingMeetingDTO(
            UUID   id,
            String title,
            String meetingType,
            String startAt,
            String endAt,
            String description
    ) {}

    // ── Secretary: create/update announcement ─────────────────────────────
    public record AnnouncementRequest(
            String  title,
            String  body,
            boolean isPinned
    ) {}

    // ── Secretary: create/update document ─────────────────────────────────
    public record DocumentRequest(
            String    title,
            String    description,
            String    category,
            String    fileUrl,
            String    fileName,
            LocalDate meetingDate
    ) {}

    // ── Secretary: update SACCO public profile ────────────────────────────
    public record PublicProfileRequest(
            String  tagline,
            String  history,
            String  mission,
            String  vision,
            Integer foundedYear,
            String  contactPhone,
            String  contactEmail,
            String  contactAddress
    ) {}
}