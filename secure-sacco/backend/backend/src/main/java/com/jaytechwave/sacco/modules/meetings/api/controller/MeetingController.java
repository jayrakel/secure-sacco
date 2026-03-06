package com.jaytechwave.sacco.modules.meetings.api.controller;

import com.jaytechwave.sacco.modules.meetings.api.dto.MeetingDTOs.*;
import com.jaytechwave.sacco.modules.meetings.domain.service.MeetingService;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('MEETINGS_READ')")
    public ResponseEntity<List<MeetingSummaryResponse>> listMeetings() {
        return ResponseEntity.ok(meetingService.listAllMeetings());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('MEETINGS_READ')")
    public ResponseEntity<MeetingSummaryResponse> getMeeting(@PathVariable UUID id) {
        return ResponseEntity.ok(meetingService.getMeeting(id));
    }

    @GetMapping("/{id}/attendance")
    @PreAuthorize("hasAuthority('MEETINGS_READ')")
    public ResponseEntity<List<AttendanceRecordResponse>> getAttendance(@PathVariable UUID id) {
        return ResponseEntity.ok(meetingService.getAttendance(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MEETINGS_MANAGE')")
    public ResponseEntity<MeetingSummaryResponse> createMeeting(
            @RequestBody CreateMeetingRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(meetingService.createMeeting(req, principal.getUsername()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MEETINGS_MANAGE')")
    public ResponseEntity<MeetingSummaryResponse> updateMeeting(
            @PathVariable UUID id,
            @RequestBody UpdateMeetingRequest req) {
        return ResponseEntity.ok(meetingService.updateMeeting(id, req));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('MEETINGS_MANAGE')")
    public ResponseEntity<MeetingSummaryResponse> cancelMeeting(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest request) {
        return ResponseEntity.ok(meetingService.cancelMeeting(id, principal.getUsername(),
                request.getRemoteAddr()));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('MEETINGS_MANAGE')")
    public ResponseEntity<MeetingSummaryResponse> completeMeeting(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest request) {
        return ResponseEntity.ok(meetingService.completeMeeting(id, principal.getUsername(),
                request.getRemoteAddr()));
    }

    @PutMapping("/{id}/attendance")
    @PreAuthorize("hasAuthority('ATTENDANCE_RECORD')")
    public ResponseEntity<List<AttendanceRecordResponse>> recordAttendance(
            @PathVariable UUID id,
            @RequestBody BulkAttendanceRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(meetingService.recordAttendance(id, req, principal.getUsername()));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MeetingAttendanceSummaryResponse>> getMyMeetings(
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        Member member = memberRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalStateException("No member profile linked to this user."));
        return ResponseEntity.ok(meetingService.getMyMeetings(member.getId()));
    }
}