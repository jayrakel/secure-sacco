package com.jaytechwave.sacco.modules.public_content.domain.service;

import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingStatus;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingRepository;
import com.jaytechwave.sacco.modules.public_content.domain.entity.PublicAnnouncement;
import com.jaytechwave.sacco.modules.public_content.domain.entity.PublicDocument;
import com.jaytechwave.sacco.modules.public_content.domain.repository.PublicAnnouncementRepository;
import com.jaytechwave.sacco.modules.public_content.domain.repository.PublicDocumentRepository;
import com.jaytechwave.sacco.modules.public_content.dto.PublicContentDTOs.*;
import com.jaytechwave.sacco.modules.settings.domain.entity.SaccoSettings;
import com.jaytechwave.sacco.modules.settings.domain.repository.SaccoSettingsRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicService {

    private final SaccoSettingsRepository     settingsRepository;
    private final PublicAnnouncementRepository announcementRepository;
    private final PublicDocumentRepository     documentRepository;
    private final MeetingRepository            meetingRepository;
    private final MemberRepository             memberRepository;
    private final UserRepository               userRepository;

    // ── Public: full landing page data ───────────────────────────────────

    @Transactional(readOnly = true)
    public LandingPageResponse getLandingPage() {
        SaccoSettings s = settingsRepository.findAll().stream().findFirst().orElse(null);

        SaccoProfileDTO profile = s == null ? null : new SaccoProfileDTO(
                s.getSaccoName(),
                s.getSaccoTagline(),
                s.getSaccoHistory(),
                s.getSaccoMission(),
                s.getSaccoVision(),
                s.getFoundedYear(),
                s.getLogoUrl(),
                s.getContactPhone(),
                s.getContactEmail(),
                s.getContactAddress()
        );

        List<AnnouncementDTO> announcements = announcementRepository
                .findByIsPublishedTrueOrderByIsPinnedDescCreatedAtDesc()
                .stream().map(this::toAnnouncementDTO).toList();

        List<DocumentDTO> documents = documentRepository
                .findByIsPublishedTrueOrderByCreatedAtDesc()
                .stream().map(this::toDocumentDTO).toList();

        // Upcoming: all SCHEDULED meetings from now forward, next 90 days
        LocalDateTime now = LocalDateTime.now();
        List<UpcomingMeetingDTO> meetings = meetingRepository
                .findByStartAtBetweenOrderByStartAtAsc(now, now.plusDays(90))
                .stream()
                .filter(m -> m.getStatus() == MeetingStatus.SCHEDULED)
                .map(this::toUpcomingMeetingDTO)
                .toList();

        long memberCount    = memberRepository.count();
        long meetingsHeld   = meetingRepository.findByStatusOrderByStartAtDesc(MeetingStatus.COMPLETED).size();
        long totalDocuments = documentRepository.count();

        return new LandingPageResponse(profile, announcements, documents, meetings,
                memberCount, meetingsHeld, totalDocuments);
    }

    // ── Secretary: announcements CRUD ────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AnnouncementDTO> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toAnnouncementDTO).toList();
    }

    @Transactional
    public AnnouncementDTO createAnnouncement(AnnouncementRequest req, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        PublicAnnouncement a = PublicAnnouncement.builder()
                .title(req.title())
                .body(req.body())
                .isPinned(req.isPinned())
                .isPublished(true)
                .publishedBy(user.getId())
                .build();
        return toAnnouncementDTO(announcementRepository.save(a));
    }

    @Transactional
    public AnnouncementDTO updateAnnouncement(UUID id, AnnouncementRequest req) {
        PublicAnnouncement a = announcementRepository.findById(id).orElseThrow();
        a.setTitle(req.title());
        a.setBody(req.body());
        a.setPinned(req.isPinned());
        return toAnnouncementDTO(announcementRepository.save(a));
    }

    @Transactional
    public void toggleAnnouncement(UUID id) {
        PublicAnnouncement a = announcementRepository.findById(id).orElseThrow();
        a.setPublished(!a.isPublished());
        announcementRepository.save(a);
    }

    @Transactional
    public void deleteAnnouncement(UUID id) {
        announcementRepository.deleteById(id);
    }

    // ── Secretary: documents CRUD ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DocumentDTO> getAllDocuments() {
        return documentRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toDocumentDTO).toList();
    }

    @Transactional
    public DocumentDTO createDocument(DocumentRequest req, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        PublicDocument d = PublicDocument.builder()
                .title(req.title())
                .description(req.description() != null ? req.description() : "")
                .category(req.category())
                .fileUrl(req.fileUrl())
                .fileName(req.fileName() != null ? req.fileName() : "")
                .meetingDate(req.meetingDate())
                .isPublished(true)
                .uploadedBy(user.getId())
                .build();
        return toDocumentDTO(documentRepository.save(d));
    }

    @Transactional
    public DocumentDTO updateDocument(UUID id, DocumentRequest req) {
        PublicDocument d = documentRepository.findById(id).orElseThrow();
        d.setTitle(req.title());
        d.setDescription(req.description() != null ? req.description() : "");
        d.setCategory(req.category());
        d.setFileUrl(req.fileUrl());
        d.setFileName(req.fileName() != null ? req.fileName() : "");
        d.setMeetingDate(req.meetingDate());
        return toDocumentDTO(documentRepository.save(d));
    }

    @Transactional
    public void toggleDocument(UUID id) {
        PublicDocument d = documentRepository.findById(id).orElseThrow();
        d.setPublished(!d.isPublished());
        documentRepository.save(d);
    }

    @Transactional
    public void deleteDocument(UUID id) {
        documentRepository.deleteById(id);
    }

    // ── Secretary: update public SACCO profile ────────────────────────────

    @Transactional
    public void updatePublicProfile(PublicProfileRequest req) {
        SaccoSettings s = settingsRepository.findAll().stream().findFirst().orElseThrow();
        s.setSaccoTagline(req.tagline());
        s.setSaccoHistory(req.history());
        s.setSaccoMission(req.mission());
        s.setSaccoVision(req.vision());
        s.setFoundedYear(req.foundedYear());
        s.setContactPhone(req.contactPhone());
        s.setContactEmail(req.contactEmail());
        s.setContactAddress(req.contactAddress());
        settingsRepository.save(s);
    }

    // ── Mappers ───────────────────────────────────────────────────────────

    private AnnouncementDTO toAnnouncementDTO(PublicAnnouncement a) {
        return new AnnouncementDTO(a.getId(), a.getTitle(), a.getBody(),
                a.isPinned(), a.getCreatedAt());
    }

    private DocumentDTO toDocumentDTO(PublicDocument d) {
        return new DocumentDTO(d.getId(), d.getTitle(), d.getDescription(),
                d.getCategory(), d.getFileUrl(), d.getFileName(),
                d.getMeetingDate(), d.getCreatedAt());
    }

    private UpcomingMeetingDTO toUpcomingMeetingDTO(Meeting m) {
        return new UpcomingMeetingDTO(
                m.getId(), m.getTitle(), m.getMeetingType().name(),
                m.getStartAt().toString(),
                m.getEndAt() != null ? m.getEndAt().toString() : null,
                m.getDescription()
        );
    }
}