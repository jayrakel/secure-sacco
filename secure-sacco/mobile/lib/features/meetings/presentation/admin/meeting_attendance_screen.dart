import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/meetings_dto.dart';
import '../../data/meetings_providers.dart';

class MeetingAttendanceScreen extends ConsumerStatefulWidget {
  final String meetingId;

  const MeetingAttendanceScreen({super.key, required this.meetingId});

  @override
  ConsumerState<MeetingAttendanceScreen> createState() => _MeetingAttendanceScreenState();
}

class _MeetingAttendanceScreenState extends ConsumerState<MeetingAttendanceScreen> {
  final List<String> _statuses = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];
  bool _isSaving = false;

  // Local state to track modifications before saving
  final Map<String, String> _modifiedStatuses = {};

  Future<void> _saveChanges() async {
    if (_modifiedStatuses.isEmpty) return;

    setState(() {
      _isSaving = true;
    });

    try {
      final records = _modifiedStatuses.entries.map((e) => {
        'memberId': e.key,
        'status': e.value,
        if (e.value == 'LATE') 'arrivedAt': DateTime.now().toUtc().toIso8601String(),
      }).toList();

      final repo = ref.read(meetingsRepositoryProvider);
      await repo.recordAttendance(widget.meetingId, records);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Attendance saved successfully'), backgroundColor: AppColors.positive),
        );
      }
      
      _modifiedStatuses.clear();
      ref.invalidate(meetingAttendanceProvider(widget.meetingId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save attendance: $e'), backgroundColor: AppColors.negative),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final attendanceAsync = ref.watch(meetingAttendanceProvider(widget.meetingId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Attendance'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          if (_modifiedStatuses.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: _isSaving 
                  ? const Center(child: Padding(padding: EdgeInsets.all(16), child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))))
                  : TextButton(
                      onPressed: _saveChanges,
                      child: const Text('Save', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
            ),
        ],
      ),
      body: attendanceAsync.when(
        data: (records) {
          if (records.isEmpty) {
            return const Center(child: Text('No attendance records found.'));
          }
          
          return ListView.builder(
            itemCount: records.length,
            itemBuilder: (context, index) {
              final record = records[index];
              final currentStatus = _modifiedStatuses[record.memberId] ?? record.status;

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text(record.memberName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(record.memberNumber),
                  trailing: DropdownButton<String>(
                    value: currentStatus == 'PENDING' ? null : currentStatus,
                    hint: const Text('Status'),
                    underline: const SizedBox(),
                    items: _statuses.map((s) => DropdownMenuItem(
                      value: s,
                      child: Text(
                        s,
                        style: TextStyle(
                          color: _getStatusColor(s),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    )).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _modifiedStatuses[record.memberId] = val;
                        });
                      }
                    },
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PRESENT': return AppColors.positive;
      case 'LATE': return Colors.orange;
      case 'ABSENT': return AppColors.negative;
      case 'EXCUSED': return Colors.blue;
      default: return Colors.grey;
    }
  }
}
