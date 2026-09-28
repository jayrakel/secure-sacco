import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../payments/data/payment_providers.dart';
import '../../../payments/data/payment_dto.dart';

class CoopAccountBalanceCard extends ConsumerStatefulWidget {
  const CoopAccountBalanceCard({super.key});

  @override
  ConsumerState<CoopAccountBalanceCard> createState() => _CoopAccountBalanceCardState();
}

class _CoopAccountBalanceCardState extends ConsumerState<CoopAccountBalanceCard> {
  CoopBalanceResponse? _balance;
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _error;
  DateTime? _lastUpdated;
  Timer? _refreshTimer;

  final _currencyFormatter = NumberFormat.currency(symbol: 'KES ', decimalDigits: 2);

  @override
  void initState() {
    super.initState();
    _fetchBalance();
    _refreshTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      _fetchBalance(isManualRefresh: false);
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchBalance({bool isManualRefresh = false}) async {
    if (!mounted) return;

    if (isManualRefresh) {
      setState(() {
        _isRefreshing = true;
      });
    } else if (_balance == null) {
      setState(() {
        _isLoading = true;
      });
    }

    setState(() {
      _error = null;
    });

    try {
      final repository = ref.read(paymentRepositoryProvider);
      final balance = await repository.getCoopBalance();
      if (mounted) {
        setState(() {
          _balance = balance;
          _lastUpdated = DateTime.now();
          _isLoading = false;
          _isRefreshing = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      
      String cleanMessage = 'Unable to fetch balance from the bank at this time.';
      final rawError = e.toString();
      
      if (rawError.contains('ACCOUNT AUTHORIZATION FAILURE') || rawError.contains('-8')) {
        cleanMessage = 'Authorization Failure: This account number is not whitelisted for your API profile.';
      } else if (rawError.contains('401') || rawError.contains('Unauthorized')) {
        cleanMessage = 'Bank Authentication Failed: Please check your API credentials.';
      } else if (rawError.contains('503')) {
        cleanMessage = 'Co-op Bank services are currently unavailable. Retrying...';
      } else if (rawError.contains('{')) {
        cleanMessage = 'The bank rejected the request due to a configuration error.';
      } else {
        cleanMessage = rawError.length > 80 ? '${rawError.substring(0, 80)}...' : rawError;
      }

      setState(() {
        _error = cleanMessage;
        _isLoading = false;
        _isRefreshing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
        border: Border.all(color: const Color(0xFF334155), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withAlpha(51),
                      borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
                    ),
                    child: const Icon(Icons.account_balance, color: Color(0xFF34D399), size: 20),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Co-op Bank Balance',
                        style: AppTextStyles.h3.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Main Sacco Account',
                        style: AppTextStyles.bodySmall.copyWith(color: const Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                onPressed: _isLoading || _isRefreshing ? null : () => _fetchBalance(isManualRefresh: true),
                icon: _isRefreshing 
                  ? const SizedBox(
                      width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.refresh, color: Color(0xFF94A3B8), size: 20),
                constraints: const BoxConstraints(),
                padding: EdgeInsets.zero,
                splashRadius: 20,
              ),
            ],
          ),
          
          const SizedBox(height: AppSpacing.lg),
          
          // Content Body
          if (_error != null)
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: const Color(0xFFF87171).withAlpha(25),
                borderRadius: BorderRadius.circular(AppSpacing.borderRadiusSm),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Color(0xFFF87171), size: 16),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      _error!,
                      style: AppTextStyles.bodySmall.copyWith(color: const Color(0xFFFCA5A5)),
                    ),
                  ),
                ],
              ),
            )
          else if (_isLoading && _balance == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
              child: Center(child: CircularProgressIndicator(color: Color(0xFF34D399))),
            )
          else if (_balance != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AVAILABLE BALANCE',
                  style: AppTextStyles.bodySmall.copyWith(color: const Color(0xFF34D399).withAlpha(204), letterSpacing: 1.2),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  _currencyFormatter.format(_balance!.availableBalance),
                  style: AppTextStyles.h1.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: AppSpacing.md),
                Container(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: Color(0x80334155))),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'BOOKED BALANCE',
                            style: AppTextStyles.bodySmall.copyWith(color: const Color(0xFF94A3B8), letterSpacing: 1.2, fontSize: 10),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _currencyFormatter.format(_balance!.bookedBalance),
                            style: AppTextStyles.bodyMedium.copyWith(color: const Color(0xFFE2E8F0), fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'LAST UPDATED',
                            style: AppTextStyles.bodySmall.copyWith(color: const Color(0xFF94A3B8), letterSpacing: 1.2, fontSize: 10),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _lastUpdated != null ? DateFormat('HH:mm').format(_lastUpdated!) : '—',
                            style: AppTextStyles.bodySmall.copyWith(color: const Color(0xFFCBD5E1)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
