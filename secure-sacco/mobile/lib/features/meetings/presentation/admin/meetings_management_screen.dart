import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/meetings_dto.dart';
import '../../data/meetings_providers.dart';
import 'create_edit_meeting_dialog.dart';
import 'meeting_qr_display_dialog.dart';

class MeetingsManagementScreen extends ConsumerWidget {
  const MeetingsManagementScreen({super.key});

  void _showCreateEditDialog(BuildContext context, [Meeting? meeting]) {
    showDialog(
      context: context,
      builder: (_) => CreateEditMeetingDialog(meeting: meeting),
    );
  }

  void _showQrDialog(BuildContext context, Meeting meeting) {
    if (meeting.qrToken == null || meeting.qrToken!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No QR Token available for this meeting.')),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (_) => MeetingQrDisplayDialog(
        qrToken: meeting.qrToken!,
        meetingTitle: meeting.title,
      ),
    );
  }

  Future<void> _updateMeetingStatus(BuildContext context, WidgetRef ref, Meeting meeting, String action) async {
    final repo = ref.read(meetingsRepositoryProvider);
    try {
      if (action == 'cancel') {
        await repo.cancel(meeting.id);
      } else if (action == 'complete') {
        await repo.complete(meeting.id);
      }
      ref.invalidate(meetingsListProvider);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.negative),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final meetingsAsync = ref.watch(meetingsListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Meetings Management'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateEditDialog(context),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: meetingsAsync.when(
        data: (meetings) {
          if (meetings.isEmpty) {
            return const Center(child: Text('No meetings found.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(meetingsListProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: meetings.length,
              itemBuilder: (context, index) {
                final meeting = meetings[index];
                return _AdminMeetingCard(
                  meeting: meeting,
                  onEdit: () => _showCreateEditDialog(context, meeting),
                  onShowQr: () => _showQrDialog(context, meeting),
                  onCancel: () => _updateMeetingStatus(context, ref, meeting, 'cancel'),
                  onComplete: () => _updateMeetingStatus(context, ref, meeting, 'complete'),
                  onViewAttendance: () => context.push('/admin/meetings/${meeting.id}/attendance'),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}

class _AdminMeetingCard extends StatelessWidget {
  final Meeting meeting;
  final VoidCallback onEdit;
  final VoidCallback onShowQr;
  final VoidCallback onCancel;
  final VoidCallback onComplete;
  final VoidCallback onViewAttendance;

  const _AdminMeetingCard({
    required this.meeting,
    required this.onEdit,
    required this.onShowQr,
    required this.onCancel,
    required this.onComplete,
    required this.onViewAttendance,
  });

  @override
  Widget build(BuildContext context) {
    final startDate = DateTime.tryParse(meeting.startAt)?.toLocal() ?? DateTime.now();
    final dateFormat = DateFormat('MMM d, yyyy h:mm a');

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
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
                    meeting.title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
                _StatusBadge(status: meeting.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${meeting.meetingType} • ${dateFormat.format(startDate)}',
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            const Divider(),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (meeting.status == 'SCHEDULED')
                  ActionChip(
                    label: const Text('Edit'),
                    avatar: const Icon(Icons.edit, size: 16),
                    onPressed: onEdit,
                  ),
                if (meeting.status == 'SCHEDULED' || meeting.status == 'ONGOING')
                  ActionChip(
                    label: const Text('Show QR'),
                    avatar: const Icon(Icons.qr_code, size: 16),
                    onPressed: onShowQr,
                  ),
                ActionChip(
                  label: const Text('Attendance'),
                  avatar: const Icon(Icons.people, size: 16),
                  onPressed: onViewAttendance,
                ),
                if (meeting.status == 'SCHEDULED' || meeting.status == 'ONGOING')
                  ActionChip(
                    label: const Text('Complete'),
                    avatar: const Icon(Icons.check_circle, size: 16, color: AppColors.positive),
                    onPressed: onComplete,
                  ),
                if (meeting.status == 'SCHEDULED')
                  ActionChip(
                    label: const Text('Cancel'),
                    avatar: const Icon(Icons.cancel, size: 16, color: AppColors.negative),
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: const Text('Cancel Meeting?'),
                          content: const Text('Are you sure you want to cancel this meeting?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(context), child: const Text('No')),
                            TextButton(
                              onPressed: () {
                                Navigator.pop(context);
                                onCancel();
                              },
                              child: const Text('Yes, Cancel', style: TextStyle(color: AppColors.negative)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
              ],
            )
          ],
        ),
      ),
    );
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
