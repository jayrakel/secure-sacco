import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/error_state_view.dart';
import '../../data/public_models.dart';
import '../../data/public_providers.dart';

final publicReceiptProvider = FutureProvider.family<PaymentRouteLookupResponse, String>((ref, reference) async {
  final api = ref.watch(publicApiProvider);
  return api.getReceipt(reference);
});

class PublicReceiptScreen extends ConsumerWidget {
  final String reference;

  const PublicReceiptScreen({super.key, required this.reference});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncData = ref.watch(publicReceiptProvider(reference));

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF7),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0B0F1E)),
        actions: [
          IconButton(
            icon: const Icon(Icons.print),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Print function is not implemented in demo')),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: asyncData.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (error, stackTrace) => ErrorStateView(
          title: 'Receipt Not Found',
          message: 'The receipt reference $reference could not be found or may have expired.',
          onRetry: () => ref.invalidate(publicReceiptProvider(reference)),
        ),
        data: (data) => _buildReceipt(context, data),
      ),
    );
  }

  Widget _buildReceipt(BuildContext context, PaymentRouteLookupResponse data) {
    final isExpenseClaim = data.internalRef?.startsWith('EXP-') ?? false;

    Color badgeBg = const Color(0xFFF3F4F6);
    Color badgeText = const Color(0xFF4B5563);
    IconData badgeIcon = Icons.info_outline;

    switch (data.paymentStatus) {
      case 'PENDING':
      case 'SUBMITTED':
        badgeBg = const Color(0xFFFEF3C7);
        badgeText = const Color(0xFFB45309);
        badgeIcon = Icons.access_time;
        break;
      case 'ROUTED':
      case 'COMPLETED':
      case 'APPROVED':
      case 'PAID':
        badgeBg = const Color(0xFFD1FAE5);
        badgeText = const Color(0xFF047857);
        badgeIcon = Icons.check_circle_outline;
        break;
      case 'FAILED':
      case 'REJECTED':
        badgeBg = const Color(0xFFFEE2E2);
        badgeText = const Color(0xFFB91C1C);
        badgeIcon = Icons.cancel_outlined;
        break;
    }

    final fmt = NumberFormat('#,##0.00', 'en_KE');
    final dateFmt = DateFormat('dd MMM yyyy, HH:mm');

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
      child: Center(
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(maxWidth: 500),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE8E4D8)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(5),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                color: const Color(0xFF0B0F1E),
                padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
                child: const Column(
                  children: [
                    Icon(Icons.verified_user, color: Color(0xFF2DD4BF), size: 36),
                    SizedBox(height: 16),
                    Text(
                      'BETTERLINK VENTURES SACCO',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        letterSpacing: 1.0,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Official Transaction Receipt',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),

              // Main Content
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Amount ${isExpenseClaim ? 'Reimbursed' : 'Paid'}',
                                style: const TextStyle(
                                  color: Color(0xFF6B7280),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  const Text(
                                    'KES ',
                                    style: TextStyle(
                                      color: Color(0xFF9CA3AF),
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    fmt.format(data.totalAmount),
                                    style: const TextStyle(
                                      color: Color(0xFF1F2937),
                                      fontSize: 32,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -1.0,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: badgeBg,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(badgeIcon, color: badgeText, size: 14),
                              const SizedBox(width: 4),
                              Text(
                                data.paymentStatus,
                                style: TextStyle(
                                  color: badgeText,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Divider(color: Color(0xFFF3F4F6), thickness: 1),
                    const SizedBox(height: 24),

                    // Details Grid
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('DATE', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                              const SizedBox(height: 4),
                              Text(dateFmt.format(DateTime.parse(data.createdAt)), style: const TextStyle(color: Color(0xFF1F2937), fontSize: 13, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('RECEIPT NO.', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                              const SizedBox(height: 4),
                              Text(data.mpesaRef ?? data.internalRef ?? '—', style: const TextStyle(color: Color(0xFF1F2937), fontSize: 13, fontWeight: FontWeight.w600, fontFamily: 'monospace')),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('MEMBER NAME', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                              const SizedBox(height: 4),
                              Text(data.memberName, style: const TextStyle(color: Color(0xFF1F2937), fontSize: 13, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('MEMBER NO.', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                              const SizedBox(height: 4),
                              Text(data.memberNumber ?? '—', style: const TextStyle(color: Color(0xFF1F2937), fontSize: 13, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ],
                    ),

                    if (data.isSplitDeposit && data.routes?.isNotEmpty == true) ...[
                      const SizedBox(height: 24),
                      const Divider(color: Color(0xFFF3F4F6), thickness: 1),
                      const SizedBox(height: 24),
                      const Text('ALLOCATION BREAKDOWN', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                      const SizedBox(height: 12),
                      ...data.routes!.map((r) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(r.productName, style: const TextStyle(color: Color(0xFF4B5563), fontSize: 13, fontWeight: FontWeight.w500)),
                            Text('KES ${fmt.format(r.amount)}', style: const TextStyle(color: Color(0xFF1F2937), fontSize: 13, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      )),
                    ],

                    if (isExpenseClaim) ...[
                      const SizedBox(height: 24),
                      const Divider(color: Color(0xFFF3F4F6), thickness: 1),
                      const SizedBox(height: 24),
                      const Text('TRANSACTION TYPE', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF3F4F6)),
                        ),
                        child: const Text('Expense Claim Reimbursement', style: TextStyle(color: Color(0xFF374151), fontSize: 13, fontWeight: FontWeight.w500)),
                      ),
                    ],
                  ],
                ),
              ),

              // Footer
              Container(
                color: const Color(0xFFF9FAFB),
                padding: const EdgeInsets.all(24),
                child: const Column(
                  children: [
                    Text(
                      'This is a system generated receipt and does not require a signature.',
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 4),
                    Text(
                      'For support, please contact SACCO administration.',
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
