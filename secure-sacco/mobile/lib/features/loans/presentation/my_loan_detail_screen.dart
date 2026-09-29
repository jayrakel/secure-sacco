import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../settings/data/settings_providers.dart';
import '../data/loan_dto.dart';
import '../data/loan_providers.dart';

class MyLoanDetailScreen extends ConsumerStatefulWidget {
  final String applicationId;

  const MyLoanDetailScreen({super.key, required this.applicationId});

  @override
  ConsumerState<MyLoanDetailScreen> createState() => _MyLoanDetailScreenState();
}

class _MyLoanDetailScreenState extends ConsumerState<MyLoanDetailScreen> {
  final _currencyFormat = NumberFormat.currency(symbol: 'KES ');
  final _dateFormat = DateFormat('MMM dd, yyyy');

  Future<void> _payApplicationFee(LoanApplication app) async {
    final phoneController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Pay Application Fee'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Amount: ${_currencyFormat.format(app.applicationFee)}'),
            const SizedBox(height: 16),
            TextField(
              controller: phoneController,
              decoration: const InputDecoration(
                labelText: 'M-Pesa Phone Number',
                hintText: '2547...',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, phoneController.text),
            child: const Text('Pay'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty && mounted) {
      try {
        final repo = ref.read(loanRepositoryProvider);
        await repo.payFee(app.id, result);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment initiated. Please check your phone.')),
          );
          ref.invalidate(myLoanApplicationsProvider);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      }
    }
  }

  Future<void> _addGuarantor(LoanApplication app) async {
    final memberNumberController = TextEditingController();
    final amountController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Add Guarantor',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: memberNumberController,
                decoration: const InputDecoration(
                  labelText: 'Guarantor Member Number',
                  border: OutlineInputBorder(),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: amountController,
                decoration: const InputDecoration(
                  labelText: 'Guaranteed Amount (KES)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'Required';
                  if (double.tryParse(val) == null) return 'Invalid amount';
                  return null;
                },
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  if (formKey.currentState!.validate()) {
                    Navigator.pop(context, true);
                  }
                },
                child: const Text('Add'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );

    if (result == true && mounted) {
      try {
        final repo = ref.read(loanRepositoryProvider);
        await repo.addGuarantor(
          app.id,
          AddGuarantorRequest(
            memberNumber: memberNumberController.text,
            guaranteedAmount: double.parse(amountController.text),
          ),
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Guarantor added successfully')),
          );
          ref.invalidate(myLoanApplicationsProvider);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      }
    }
  }

  Future<void> _removeGuarantor(LoanApplication app, String guarantorId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Guarantor'),
        content: const Text('Are you sure you want to remove this guarantor?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.negative),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      final repo = ref.read(loanRepositoryProvider);
      await repo.removeGuarantor(app.id, guarantorId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Guarantor removed')),
        );
        ref.invalidate(myLoanApplicationsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _submitApplication(LoanApplication app) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Submit Application'),
        content: const Text('Are you sure you want to submit this application for approval?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      final repo = ref.read(loanRepositoryProvider);
      await repo.submitApplication(app.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Application submitted successfully!')),
        );
        ref.invalidate(myLoanApplicationsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _repayLoan(LoanApplication app, LoanSummary summary) async {
    final phoneController = TextEditingController();
    final amountController = TextEditingController(text: summary.nextDueAmount.toStringAsFixed(2));
    final formKey = GlobalKey<FormState>();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Repay Loan',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: amountController,
                decoration: const InputDecoration(
                  labelText: 'Amount (KES)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'Required';
                  if (double.tryParse(val) == null) return 'Invalid amount';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: phoneController,
                decoration: const InputDecoration(
                  labelText: 'M-Pesa Phone Number',
                  hintText: '2547...',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  if (formKey.currentState!.validate()) {
                    Navigator.pop(context, true);
                  }
                },
                child: const Text('Initiate Payment'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );

    if (result == true && mounted) {
      try {
        final repo = ref.read(loanRepositoryProvider);
        await repo.repayLoan(app.id, phoneController.text, double.parse(amountController.text));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Repayment initiated. Please check your phone.')),
          );
          ref.invalidate(myLoanApplicationsProvider);
          ref.invalidate(loanSummaryProvider(app.id));
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final applicationsAsync = ref.watch(myLoanApplicationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan Details'),
      ),
      body: applicationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Failed to load application: $err')),
        data: (applications) {
          final app = applications.firstWhere(
            (a) => a.id == widget.applicationId,
            orElse: () => throw Exception('Application not found'),
          );

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(app),
                const SizedBox(height: 24),
                _buildDetailsCard(app),
                const SizedBox(height: 24),
                if (app.status.toUpperCase() == 'ACTIVE') _buildLoanSummary(app),
                const SizedBox(height: 24),
                _buildGuarantorsSection(app),
                const SizedBox(height: 32),
                _buildActionButtons(app),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(LoanApplication app) {
    final statusColor = _getStatusColor(app.status);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                app.productName,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Application ID: ${app.id.substring(0, 8).toUpperCase()}',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: statusColor),
          ),
          child: Text(
            app.status,
            style: TextStyle(
              color: statusColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsCard(LoanApplication app) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            _buildDetailRow('Principal Amount', _currencyFormat.format(app.principalAmount)),
            const Divider(),
            _buildDetailRow('Purpose', app.purpose),
            const Divider(),
            _buildDetailRow('Term', '${app.termWeeks} weeks'),
            const Divider(),
            _buildDetailRow('Applied On', _dateFormat.format(DateTime.parse(app.createdAt))),
            const Divider(),
            _buildDetailRow(
              'App Fee Paid',
              app.applicationFeePaid ? 'Yes' : 'No',
              valueColor: app.applicationFeePaid ? AppColors.positive : AppColors.negative,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade700)),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: valueColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoanSummary(LoanApplication app) {
    final summaryAsync = ref.watch(loanSummaryProvider(app.id));

    return summaryAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, stack) => Text('Failed to load summary: $err'),
      data: (summary) {
        return Card(
          color: Colors.blue.shade50,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.blue.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Loan Summary',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue.shade900,
                  ),
                ),
                const SizedBox(height: 16),
                _buildDetailRow('Outstanding Balance', _currencyFormat.format(summary.totalOutstanding)),
                _buildDetailRow('Arrears', _currencyFormat.format(summary.totalArrears),
                    valueColor: summary.totalArrears > 0 ? AppColors.negative : null),
                if (summary.nextDueDate != null)
                  _buildDetailRow('Next Due Date', _dateFormat.format(DateTime.parse(summary.nextDueDate!))),
                _buildDetailRow('Next Due Amount', _currencyFormat.format(summary.nextDueAmount)),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => _repayLoan(app, summary),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade900,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Make Repayment'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildGuarantorsSection(LoanApplication app) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Guarantors',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (app.status.toUpperCase() == 'PENDING_GUARANTORS')
              TextButton.icon(
                onPressed: () => _addGuarantor(app),
                icon: const Icon(Icons.add),
                label: const Text('Add'),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (app.guarantors.isEmpty)
          const Text('No guarantors added yet.')
        else ...[
          _buildGuarantorProgress(app),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: app.guarantors.length,
            itemBuilder: (context, index) {
              final g = app.guarantors[index];
              return Card(
                child: ListTile(
                  title: Text(g.guarantorName),
                  subtitle: Text('Member #: ${g.guarantorMemberNumber}'),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _currencyFormat.format(g.guaranteedAmount),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        g.status,
                        style: TextStyle(
                          color: _getStatusColor(g.status),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (app.status.toUpperCase() == 'PENDING_GUARANTORS')
                        IconButton(
                          icon: const Icon(Icons.delete, color: AppColors.negative, size: 20),
                          onPressed: () => _removeGuarantor(app, g.id),
                          constraints: const BoxConstraints(),
                          padding: EdgeInsets.zero,
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ],
    );
  }

  Widget _buildGuarantorProgress(LoanApplication app) {
    final settingsAsync = ref.watch(saccoSettingsProvider);
    final capacityPct = settingsAsync.asData?.value.guarantorCapacityPct ?? 50.0;
    
    final requiredAmount = app.principalAmount * (capacityPct / 100);
    final currentAmount = app.guarantors.fold<double>(0, (sum, g) => sum + g.guaranteedAmount);
    final progress = (currentAmount / requiredAmount).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Capacity: ${_currencyFormat.format(currentAmount)} / ${_currencyFormat.format(requiredAmount)}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            Text('${(progress * 100).toStringAsFixed(0)}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 4),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: Colors.grey.shade300,
          color: progress >= 1.0 ? AppColors.positive : AppColors.primary,
        ),
      ],
    );
  }

  Widget _buildActionButtons(LoanApplication app) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (app.status.toUpperCase() == 'PENDING_FEE')
          ElevatedButton(
            onPressed: () => _payApplicationFee(app),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Pay Application Fee'),
          ),
        if (app.status.toUpperCase() == 'PENDING_GUARANTORS')
          ElevatedButton(
            onPressed: () => _submitApplication(app),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: AppColors.positive,
              foregroundColor: Colors.white,
            ),
            child: const Text('Submit Application for Approval'),
          ),
        if (['PENDING_APPROVAL', 'VERIFIED', 'APPROVED'].contains(app.status.toUpperCase()))
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8.0),
            child: Text(
              'Under Review by Sacco Committee',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return Colors.orange;
      case 'VERIFIED':
        return Colors.blue;
      case 'APPROVED':
        return Colors.teal;
      case 'ACTIVE':
        return AppColors.positive;
      case 'REJECTED':
        return AppColors.negative;
      case 'CLEARED':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}
