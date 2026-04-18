package com.jaytechwave.sacco.modules.meetings.job;

import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingStatus;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingRepository;
import com.jaytechwave.sacco.modules.meetings.domain.service.MeetingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Runs every 5 minutes. Finds SCHEDULED meetings whose end time has passed
 * and automatically completes them, triggering penalty generation for absent
 * and late members.
 *
 * <p>Two cases handled:</p>
 * <ol>
 *   <li><strong>Meetings with explicit endAt</strong> — completed when
 *       {@code endAt <= now}.</li>
 *   <li><strong>Meetings with no endAt</strong> — completed when
 *       {@code startAt + 3 hours <= now}. The 3-hour default is a safety net
 *       so meetings never remain open indefinitely. Set endAt explicitly when
 *       scheduling to override this.</li>
 * </ol>
 *
 * <p>Staff can still click "Complete" manually before the scheduled end time
 * — that triggers penalties immediately. This job only handles meetings that
 * were never manually completed.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MeetingAutoCompleteJob {

    /** Default meeting duration when no endAt is set. */
    private static final int DEFAULT_DURATION_HOURS = 3;

    private final MeetingRepository meetingRepository;
    private final MeetingService    meetingService;

    /** Runs every 5 minutes. */
    @Scheduled(fixedDelay = 300_000)
    public void autoComplete() {
        LocalDateTime now = LocalDateTime.now();

        List<Meeting> toComplete = new ArrayList<>();

        // Case 1: meetings with explicit endAt that has passed
        toComplete.addAll(meetingRepository.findByStatusAndEndAtLessThanEqual(
                MeetingStatus.SCHEDULED, now));

        // Case 2: meetings with no endAt, started more than DEFAULT_DURATION_HOURS ago
        LocalDateTime cutoff = now.minusHours(DEFAULT_DURATION_HOURS);
        toComplete.addAll(meetingRepository.findScheduledWithNoEndAtBefore(
                MeetingStatus.SCHEDULED, cutoff));

        if (toComplete.isEmpty()) return;

        log.info("MeetingAutoCompleteJob: {} meeting(s) will be auto-completed.", toComplete.size());

        for (Meeting meeting : toComplete) {
            try {
                meetingService.autoCompleteMeeting(meeting.getId());
                log.info("MeetingAutoCompleteJob: Meeting '{}' [{}] auto-completed and penalties generated.",
                        meeting.getTitle(), meeting.getId());
            } catch (Exception e) {
                log.error("MeetingAutoCompleteJob: Failed to auto-complete meeting {}: {}",
                        meeting.getId(), e.getMessage(), e);
            }
        }
    }
}