import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../data/meetings_providers.dart';
import '../data/meetings_dto.dart';

class MyMeetingsScreen extends ConsumerWidget {
  const MyMeetingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final meetingsAsync = ref.watch(myMeetingsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Meetings'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
      ),
      body: meetingsAsync.when(
        data: (meetings) {
          if (meetings.isEmpty) {
            return const Center(child: Text('No meetings found.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(myMeetingsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: meetings.length,
              itemBuilder: (context, index) {
                final meeting = meetings[index];
                return _MeetingCard(meeting: meeting);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error: $err'),
              ElevatedButton(
                onPressed: () => ref.refresh(myMeetingsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MeetingCard extends StatelessWidget {
  final MyMeetingSummary meeting;

  const _MeetingCard({required this.meeting});

  bool get isUpcomingOrOngoing {
    return meeting.meetingStatus == 'SCHEDULED' || meeting.meetingStatus == 'ONGOING';
  }

  bool _isEligibleForCheckIn(DateTime start) {
    final now = DateTime.now();
    final timeUntilStart = start.difference(now);
    // Allow check-in if it's within 30 minutes of starting, or has already started (within a reasonable window)
    return timeUntilStart.inMinutes <= 30 && timeUntilStart.inHours > -4;
  }

  @override
  Widget build(BuildContext context) {
    final startDate = DateTime.tryParse(meeting.startAt)?.toLocal() ?? DateTime.now();
    final dateFormat = DateFormat('MMM d, yyyy h:mm a');
    final canCheckIn = isUpcomingOrOngoing && meeting.myStatus == null && _isEligibleForCheckIn(startDate);

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    meeting.meetingTitle,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
                _StatusBadge(status: meeting.meetingStatus),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  dateFormat.format(startDate),
                  style: const TextStyle(color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Attendance', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    const SizedBox(height: 4),
                    Text(
                      meeting.myStatus ?? 'Not Recorded',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _getAttendanceColor(meeting.myStatus),
                      ),
                    ),
                  ],
                ),
                if (canCheckIn)
                  ElevatedButton.icon(
                    onPressed: () {
                      context.push('/member/meetings/scanner', extra: meeting.meetingId);
                    },
                    icon: const Icon(Icons.qr_code_scanner, size: 16),
                    label: const Text('Check In'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                    ),
                  ),
              ],
            )
          ],
        ),
      ),
    );
  }

  Color _getAttendanceColor(String? status) {
    switch (status) {
      case 'PRESENT':
        return AppColors.positive;
      case 'LATE':
        return Colors.orange;
      case 'ABSENT':
        return AppColors.negative;
      case 'EXCUSED':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'SCHEDULED':
        color = Colors.blue;
        break;
      case 'ONGOING':
        color = Colors.green;
        break;
      case 'COMPLETED':
        color = Colors.grey;
        break;
      case 'CANCELED':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
