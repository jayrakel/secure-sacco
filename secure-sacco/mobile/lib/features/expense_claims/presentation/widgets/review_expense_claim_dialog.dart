import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/expense_claim_dto.dart';
import '../../data/expense_claim_providers.dart';

class ReviewExpenseClaimDialog extends ConsumerStatefulWidget {
  final ExpenseClaimResponse claim;

  const ReviewExpenseClaimDialog({super.key, required this.claim});

  @override
  ConsumerState<ReviewExpenseClaimDialog> createState() => _ReviewExpenseClaimDialogState();
}

class _ReviewExpenseClaimDialogState extends ConsumerState<ReviewExpenseClaimDialog> {
  final _reasonCtrl = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitReview(bool approve) async {
    if (!approve && _reasonCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Rejection reason is required.'), backgroundColor: AppColors.negative),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final request = ReviewExpenseClaimRequest(
        approved: approve,
        rejectionReason: approve ? null : _reasonCtrl.text.trim(),
      );

      final repo = ref.read(expenseClaimRepositoryProvider);
      await repo.reviewClaim(widget.claim.id, request);

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(approve ? 'Claim approved successfully!' : 'Claim rejected.'),
            backgroundColor: approve ? AppColors.positive : AppColors.warning,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.negative),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Review Claim - ${widget.claim.memberName ?? "Member"}'),
      content: SizedBox(
        width: 400,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Amount: KES ${widget.claim.amount}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Text('Description: ${widget.claim.description}'),
            const SizedBox(height: 8),
            if (widget.claim.receiptReference != null) Text('Receipt Ref: ${widget.claim.receiptReference}'),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            const Text('Rejection Reason (Required if rejecting):', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _reasonCtrl,
              decoration: const InputDecoration(
                hintText: 'Enter reason for rejection...',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context, false),
          child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : () => _submitReview(false),
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.negative, foregroundColor: Colors.white),
          child: const Text('Reject'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : () => _submitReview(true),
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.positive, foregroundColor: Colors.white),
          child: const Text('Approve'),
        ),
      ],
    );
  }
}
