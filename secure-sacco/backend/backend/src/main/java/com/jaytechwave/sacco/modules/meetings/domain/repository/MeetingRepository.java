package com.jaytechwave.sacco.modules.meetings.domain.repository;

import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    List<Meeting> findAllByOrderByStartAtDesc();
    List<Meeting> findByStartAtBetweenOrderByStartAtAsc(LocalDateTime from, LocalDateTime to);
    List<Meeting> findByStatusOrderByStartAtDesc(MeetingStatus status);
}