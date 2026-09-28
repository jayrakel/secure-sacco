import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../data/expense_claim_providers.dart';
import 'widgets/review_expense_claim_dialog.dart';

class AdminExpenseClaimsScreen extends ConsumerWidget {
  const AdminExpenseClaimsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final claimsAsync = ref.watch(allExpenseClaimsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('All Expense Claims'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(allExpenseClaimsProvider),
          ),
        ],
      ),
      body: claimsAsync.when(
        data: (claims) {
          if (claims.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.assignment_turned_in, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text(
                    'No expense claims found',
                    style: TextStyle(fontSize: 18, color: Colors.grey.shade600, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(allExpenseClaimsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
              itemCount: claims.length,
              itemBuilder: (context, index) {
                final claim = claims[index];
                return _buildAdminClaimCard(context, ref, claim);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Text('Failed to load claims:\n$err', textAlign: TextAlign.center),
        ),
      ),
    );
  }

  Widget _buildAdminClaimCard(BuildContext context, WidgetRef ref, dynamic claim) {
    final formatter = NumberFormat.currency(symbol: 'KES ');
    final date = DateTime.tryParse(claim.createdAt) ?? DateTime.now();
    
    Color statusColor;
    switch (claim.status.toString().toUpperCase()) {
      case 'APPROVED':
        statusColor = AppColors.positive;
        break;
      case 'REJECTED':
        statusColor = AppColors.negative;
        break;
      case 'PENDING':
      default:
        statusColor = AppColors.warning;
    }

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: statusColor.withValues(alpha: 0.3), width: 1),
      ),
      child: InkWell(
        onTap: claim.status.toString().toUpperCase() == 'PENDING'
            ? () async {
                final result = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => ReviewExpenseClaimDialog(claim: claim),
                );
                if (result == true) {
                  ref.invalidate(allExpenseClaimsProvider);
                }
              }
            : null,
        borderRadius: BorderRadius.circular(12),
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
                      '${claim.memberName ?? "Member"} (${claim.memberNumber ?? "N/A"})',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: statusColor),
                    ),
                    child: Text(
                      claim.status.toString().toUpperCase(),
                      style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      claim.description,
                      style: TextStyle(fontSize: 15, color: Colors.grey.shade800),
                    ),
                  ),
                  Text(
                    formatter.format(claim.amount),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(
                    DateFormat('MMM d, yyyy').format(date.toLocal()),
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                  const Spacer(),
                  if (claim.receiptReference != null && claim.receiptReference!.isNotEmpty)
                    Text(
                      'Ref: ${claim.receiptReference}',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                ],
              ),
              if (claim.status.toString().toUpperCase() == 'PENDING') ...[
                const Divider(height: 24),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      'Tap to Review',
                      style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                    ),
                    Icon(Icons.chevron_right, color: AppColors.primary),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
