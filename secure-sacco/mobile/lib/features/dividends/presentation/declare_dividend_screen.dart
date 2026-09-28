import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../data/dividend_providers.dart';
import '../data/dividend_dto.dart';

class DeclareDividendScreen extends ConsumerStatefulWidget {
  const DeclareDividendScreen({super.key});

  @override
  ConsumerState<DeclareDividendScreen> createState() => _DeclareDividendScreenState();
}

class _DeclareDividendScreenState extends ConsumerState<DeclareDividendScreen> {
  final _formKey = GlobalKey<FormState>();
  final _yearController = TextEditingController(text: (DateTime.now().year - 1).toString());
  final _rateController = TextEditingController();
  String _calculationMode = 'SHARE_CAPITAL';

  bool _isLoadingPreview = false;
  PreviewDividendResponse? _previewResponse;

  bool _isDeclaring = false;

  final currencyFormatter = NumberFormat.currency(symbol: 'KES ', decimalDigits: 2);

  @override
  void dispose() {
    _yearController.dispose();
    _rateController.dispose();
    super.dispose();
  }

  Future<void> _fetchPreview() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoadingPreview = true;
      _previewResponse = null;
    });

    try {
      final request = DeclareDividendRequest(
        financialYear: int.parse(_yearController.text),
        ratePercentage: double.parse(_rateController.text),
        calculationMode: _calculationMode,
      );

      final repo = ref.read(dividendRepositoryProvider);
      final response = await repo.previewDividends(request);

      setState(() {
        _previewResponse = response;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.negative),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingPreview = false;
        });
      }
    }
  }

  Future<void> _declareDividend() async {
    if (_previewResponse == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Declaration'),
        content: Text(
          'Are you sure you want to declare dividends for FY ${_yearController.text} at ${_rateController.text}%?\n\n'
          'Total Amount: ${currencyFormatter.format(_previewResponse!.totalDividend)}\n\n'
          'This action cannot be undone and will immediately post journal entries.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Declare & Post'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isDeclaring = true;
    });

    try {
      final request = DeclareDividendRequest(
        financialYear: int.parse(_yearController.text),
        ratePercentage: double.parse(_rateController.text),
        calculationMode: _calculationMode,
      );

      final repo = ref.read(dividendRepositoryProvider);
      await repo.declareDividend(request);

      // Refresh list
      ref.invalidate(dividendDeclarationsProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Dividends declared successfully!'), backgroundColor: AppColors.positive),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.negative),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isDeclaring = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Declare Dividend'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg)),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Dividend Parameters', style: AppTextStyles.h2),
                      const SizedBox(height: AppSpacing.md),
                      TextFormField(
                        controller: _yearController,
                        decoration: const InputDecoration(
                          labelText: 'Financial Year',
                          prefixIcon: Icon(Icons.calendar_today),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Required';
                          if (int.tryParse(value) == null) return 'Invalid year';
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextFormField(
                        controller: _rateController,
                        decoration: const InputDecoration(
                          labelText: 'Rate Percentage (%)',
                          prefixIcon: Icon(Icons.percent),
                          hintText: 'e.g. 10.5',
                        ),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Required';
                          if (double.tryParse(value) == null) return 'Invalid rate';
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),
                      DropdownButtonFormField<String>(
                        value: _calculationMode,
                        decoration: const InputDecoration(
                          labelText: 'Calculation Mode',
                          prefixIcon: Icon(Icons.calculate),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'SHARE_CAPITAL', child: Text('Share Capital Only')),
                          DropdownMenuItem(value: 'SAVINGS', child: Text('Savings Only')),
                          DropdownMenuItem(value: 'BOTH', child: Text('Both')),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setState(() {
                              _calculationMode = value;
                              _previewResponse = null; // reset preview
                            });
                          }
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isLoadingPreview ? null : _fetchPreview,
                          child: _isLoadingPreview
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('Preview Dividends'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (_previewResponse != null) ...[
              const SizedBox(height: AppSpacing.xl),
              const Text('Preview Results', style: AppTextStyles.h2),
              const SizedBox(height: AppSpacing.md),
              Card(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
                  side: BorderSide(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    children: [
                      const Text('Total Estimated Dividend', style: AppTextStyles.bodyMedium),
                      const SizedBox(height: 4),
                      Text(
                        currencyFormatter.format(_previewResponse!.totalDividend),
                        style: AppTextStyles.h1.copyWith(color: AppColors.primary),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              const Text('Member Breakdown (First 50)', style: AppTextStyles.h3),
              const SizedBox(height: AppSpacing.sm),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _previewResponse!.items.take(50).length,
                itemBuilder: (context, index) {
                  final item = _previewResponse!.items[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: ListTile(
                      title: Text('${item.memberNumber} - ${item.memberName}'),
                      subtitle: Text('Base: ${currencyFormatter.format(item.baseAmount)}'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('Net: ${currencyFormatter.format(item.netDividend)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.positive)),
                          if (item.arrears > 0)
                            Text('Arrears Deducted: ${currencyFormatter.format(item.arrears)}', style: const TextStyle(fontSize: 10, color: AppColors.negative)),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.xl),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isDeclaring ? null : _declareDividend,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isDeclaring
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Declare & Post Journals', style: TextStyle(fontSize: 16, color: Colors.white)),
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
            ],
          ],
        ),
      ),
    );
  }
}
