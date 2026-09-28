import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../data/member_providers.dart';
import '../../admin/presentation/widgets/admin_drawer.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/authenticated_avatar.dart';
import 'package:intl/intl.dart';
import 'create_member_bottom_sheet.dart';

class MemberListScreen extends ConsumerWidget {
  const MemberListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paginatedResponse = ref.watch(memberListProvider);
    final filter = ref.watch(memberListFilterProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Members'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Colors.white),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (ctx) => const CreateMemberBottomSheet(),
              );
            },
          ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            color: AppColors.surface,
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search members...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                    ),
                    onSubmitted: (value) {
                      ref.read(memberListFilterProvider.notifier).updateFilter(query: value);
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  flex: 1,
                  child: DropdownButtonFormField<String>(
                    initialValue: filter.status,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'ALL', child: Text('All')),
                      DropdownMenuItem(value: 'PENDING', child: Text('Pending')),
                      DropdownMenuItem(value: 'ACTIVE', child: Text('Active')),
                      DropdownMenuItem(value: 'INACTIVE', child: Text('Inactive')),
                      DropdownMenuItem(value: 'SUSPENDED', child: Text('Suspended')),
                      DropdownMenuItem(value: 'DECEASED', child: Text('Deceased')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        ref.read(memberListFilterProvider.notifier).updateFilter(status: val);
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: paginatedResponse.when(
              data: (data) {
                if (data.content.isEmpty) {
                  return const Center(child: Text('No members found.'));
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    return ref.refresh(memberListProvider.future);
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: data.content.length,
                    separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final member = data.content[index];
                      return _buildMemberCard(context, member);
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Error: $err', style: const TextStyle(color: AppColors.negative))),
            ),
          ),
          
          // Pagination Controls
          paginatedResponse.maybeWhen(
            data: (data) {
              if (data.totalPages <= 1) return const SizedBox.shrink();
              return Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  border: Border(top: BorderSide(color: Colors.grey.shade200)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton.icon(
                      onPressed: filter.page > 0 
                          ? () => ref.read(memberListFilterProvider.notifier).prevPage() 
                          : null,
                      icon: const Icon(Icons.chevron_left),
                      label: const Text('Prev'),
                    ),
                    Text('Page ${filter.page + 1} of ${data.totalPages}'),
                    TextButton.icon(
                      onPressed: filter.page < data.totalPages - 1 
                          ? () => ref.read(memberListFilterProvider.notifier).nextPage(data.totalPages) 
                          : null,
                      icon: const Icon(Icons.chevron_right),
                      label: const Text('Next'),
                      iconAlignment: IconAlignment.end,
                    ),
                  ],
                ),
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberCard(BuildContext context, member) {
    Color statusColor;
    switch (member.status) {
      case 'ACTIVE':
        statusColor = AppColors.positive;
        break;
      case 'PENDING':
      case 'INACTIVE':
      case 'SUSPENDED':
        statusColor = AppColors.warning;
        break;
      case 'DECEASED':
        statusColor = AppColors.negative;
        break;
      default:
        statusColor = AppColors.textSecondary;
    }

    return InkWell(
      onTap: () => context.push('/admin/members/${member.id}'),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(5),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                AuthenticatedAvatar(
                  imageUrl: member.profilePhotoUrl,
                  fallbackText: member.firstName.isNotEmpty ? member.firstName[0].toUpperCase() : '?',
                  radius: 24,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(member.fullName, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withAlpha(20),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              member.memberNumber,
                              style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: statusColor.withAlpha(20),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              member.status,
                              style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (member.createdAt != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Joined', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                      Text(
                        DateFormat('MMM d, yyyy').format(DateTime.parse(member.createdAt!).toLocal()),
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
              ],
            ),
            if (member.phoneNumber.isNotEmpty || member.email.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.md),
              const Divider(height: 1),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  if (member.phoneNumber.isNotEmpty) ...[
                    Icon(Icons.phone_rounded, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(member.phoneNumber, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    const SizedBox(width: AppSpacing.md),
                  ],
                  if (member.email.isNotEmpty) ...[
                    Icon(Icons.email_rounded, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        member.email, 
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),
            ]
          ],
        ),
      ),
    );
  }
}
