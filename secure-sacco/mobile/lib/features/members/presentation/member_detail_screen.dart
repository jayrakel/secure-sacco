import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/member_providers.dart';
import '../data/member_repository.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';

class MemberDetailScreen extends ConsumerWidget {
  final String memberId;
  const MemberDetailScreen({super.key, required this.memberId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final memberAsync = ref.watch(memberDetailProvider(memberId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Member Details'),
      ),
      body: memberAsync.when(
        data: (member) {
          return RefreshIndicator(
            onRefresh: () async {
              return ref.refresh(memberDetailProvider(memberId).future);
            },
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                _buildProfileHeader(member),
                const SizedBox(height: AppSpacing.lg),
                _buildSectionTitle('Personal Information'),
                _buildInfoCard([
                  _InfoRow('Email', member.email),
                  _InfoRow('Phone', member.phoneNumber),
                  if (member.nationalId != null) _InfoRow('National ID', member.nationalId!),
                  if (member.dateOfBirth != null) _InfoRow('Date of Birth', member.dateOfBirth!),
                  if (member.gender != null) _InfoRow('Gender', member.gender!),
                ]),
                const SizedBox(height: AppSpacing.lg),
                _buildSectionTitle('Status Actions'),
                _buildStatusActions(context, ref, member),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildProfileHeader(dynamic member) {
    Color statusColor;
    switch (member.status) {
      case 'ACTIVE': statusColor = AppColors.positive; break;
      case 'PENDING':
      case 'INACTIVE':
      case 'SUSPENDED': statusColor = AppColors.warning; break;
      case 'DECEASED': statusColor = AppColors.negative; break;
      default: statusColor = AppColors.textSecondary;
    }

    return Column(
      children: [
        CircleAvatar(
          radius: 50,
          backgroundColor: AppColors.primary,
          child: Text(
            member.firstName.isNotEmpty ? member.firstName[0].toUpperCase() : '?',
            style: const TextStyle(fontSize: 40, color: Colors.white),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(member.fullName, style: AppTextStyles.h2),
        const SizedBox(height: 4),
        Text(member.memberNumber, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
        const SizedBox(height: AppSpacing.sm),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: statusColor.withAlpha(30),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            member.status,
            style: AppTextStyles.bodyMedium.copyWith(color: statusColor, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Text(title, style: AppTextStyles.h3),
    );
  }

  Widget _buildInfoCard(List<_InfoRow> rows) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: rows.expand((r) => [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: Text(r.label, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
              ),
              Expanded(
                flex: 3,
                child: Text(r.value, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w500)),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
        ]).toList()..removeLast(),
      ),
    );
  }

  Widget _buildStatusActions(BuildContext context, WidgetRef ref, member) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        children: [
          if (member.status != 'ACTIVE')
            ElevatedButton(
              onPressed: () => _showStatusConfirm(context, ref, 'ACTIVE'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.positive, minimumSize: const Size.fromHeight(48)),
              child: const Text('Activate Member', style: TextStyle(color: Colors.white)),
            ),
          if (member.status != 'ACTIVE') const SizedBox(height: AppSpacing.sm),
          if (member.status != 'SUSPENDED')
            ElevatedButton(
              onPressed: () => _showStatusConfirm(context, ref, 'SUSPENDED'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.warning, minimumSize: const Size.fromHeight(48)),
              child: const Text('Suspend Member', style: TextStyle(color: Colors.white)),
            ),
          if (member.status != 'SUSPENDED') const SizedBox(height: AppSpacing.sm),
          if (member.status != 'INACTIVE')
            ElevatedButton(
              onPressed: () => _showStatusConfirm(context, ref, 'INACTIVE'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.negative, minimumSize: const Size.fromHeight(48)),
              child: const Text('Deactivate Account', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
    );
  }

  void _showStatusConfirm(BuildContext context, WidgetRef ref, String newStatus) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Action'),
        content: Text("Are you sure you want to change this member's status to $newStatus?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ref.read(memberRepositoryProvider).updateMemberStatus(memberId, newStatus);
                ref.invalidate(memberDetailProvider(memberId));
                ref.invalidate(memberListProvider);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status updated to $newStatus')));
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.negative));
                }
              }
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }
}

class _InfoRow {
  final String label;
  final String value;
  _InfoRow(this.label, this.value);
}
