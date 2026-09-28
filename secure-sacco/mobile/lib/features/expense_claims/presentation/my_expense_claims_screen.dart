import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../data/expense_claim_providers.dart';

class MyExpenseClaimsScreen extends ConsumerWidget {
  const MyExpenseClaimsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final claimsAsync = ref.watch(myExpenseClaimsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Expense Claims'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(myExpenseClaimsProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        onPressed: () {
          context.push('/member/expense-claims/submit').then((_) {
            ref.invalidate(myExpenseClaimsProvider);
          });
        },
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Claim', style: TextStyle(color: Colors.white)),
      ),
      body: claimsAsync.when(
        data: (claims) {
          if (claims.isEmpty) {
            return _buildEmptyState();
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myExpenseClaimsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.only(top: 16, bottom: 80, left: 16, right: 16),
              itemCount: claims.length,
              itemBuilder: (context, index) {
                final claim = claims[index];
                return _buildClaimCard(context, claim);
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

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'No expense claims found',
            style: TextStyle(fontSize: 18, color: Colors.grey.shade600, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Tap the button below to submit a new claim',
            style: TextStyle(color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildClaimCard(BuildContext context, dynamic claim) {
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
                    claim.description,
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
            const SizedBox(height: 8),
            Text(
              formatter.format(claim.amount),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
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
            if (claim.rejectionReason != null && claim.rejectionReason!.isNotEmpty) ...[
              const Divider(height: 24),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, color: AppColors.negative, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Reason: ${claim.rejectionReason}',
                      style: const TextStyle(color: AppColors.negative, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ],
            if (claim.journalReference != null && claim.journalReference!.isNotEmpty) ...[
              const Divider(height: 24),
              Text(
                'Paid (JRN: ${claim.journalReference})',
                style: const TextStyle(color: AppColors.positive, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
