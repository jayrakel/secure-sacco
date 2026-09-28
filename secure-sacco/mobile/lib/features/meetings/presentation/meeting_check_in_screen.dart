import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../data/meetings_providers.dart';

class MeetingCheckInScreen extends ConsumerStatefulWidget {
  final String token;

  const MeetingCheckInScreen({super.key, required this.token});

  @override
  ConsumerState<MeetingCheckInScreen> createState() => _MeetingCheckInScreenState();
}

class _MeetingCheckInScreenState extends ConsumerState<MeetingCheckInScreen> {
  bool _isCheckingIn = false;

  Future<void> _handleCheckIn() async {
    setState(() {
      _isCheckingIn = true;
    });

    try {
      final repo = ref.read(meetingsRepositoryProvider);
      final result = await repo.checkInByToken(widget.token);
      
      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Successfully checked in! Status: ${result.status}'),
          backgroundColor: AppColors.positive,
        ),
      );
      
      ref.invalidate(myMeetingsProvider);
      context.go('/member/dashboard');
      
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Check-in failed: ${e.toString()}'),
          backgroundColor: AppColors.negative,
        ),
      );
      setState(() {
        _isCheckingIn = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final meetingInfoAsync = ref.watch(meetingInfoProvider(widget.token));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meeting Check-In'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
      ),
      body: meetingInfoAsync.when(
        data: (info) {
          final startDate = DateTime.tryParse(info.startAt)?.toLocal() ?? DateTime.now();
          final dateFormat = DateFormat('MMM d, yyyy h:mm a');
          
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.fact_check, size: 64, color: AppColors.primary),
                  const SizedBox(height: 24),
                  Text(
                    info.title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    info.meetingType,
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.access_time, size: 16, color: Colors.grey),
                      const SizedBox(width: 8),
                      Text(
                        dateFormat.format(startDate),
                        style: const TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 48),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isCheckingIn ? null : _handleCheckIn,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isCheckingIn
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Confirm Check-In', style: TextStyle(fontSize: 18)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: AppColors.negative),
                const SizedBox(height: 16),
                const Text(
                  'Invalid or Expired Link',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  err.toString(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.go('/member/dashboard'),
                  child: const Text('Go to Dashboard'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
