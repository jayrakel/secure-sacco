import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/loan_dto.dart';
import '../../data/loan_providers.dart';
import 'disburse_loan_modal.dart';

class StaffLoanDetailScreen extends ConsumerStatefulWidget {
  final String applicationId;

  const StaffLoanDetailScreen({super.key, required this.applicationId});

  @override
  ConsumerState<StaffLoanDetailScreen> createState() => _StaffLoanDetailScreenState();
}

class _StaffLoanDetailScreenState extends ConsumerState<StaffLoanDetailScreen> {
  final _currencyFormat = NumberFormat.currency(symbol: 'KES ');
  final _dateFormat = DateFormat('MMM dd, yyyy');

  Future<void> _performAction(String action, LoanApplication app) async {
    if (action == 'DISBURSE') {
      final result = await showDialog<bool>(
        context: context,
        builder: (context) => DisburseLoanModal(application: app),
      );
      
      if (result == true && mounted) {
        try {
          final repo = ref.read(loanRepositoryProvider);
          await repo.disburseLoan(app.id);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Loan disbursed successfully')),
            );
            ref.invalidate(allLoanApplicationsProvider);
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error: $e')),
            );
          }
        }
      }
      return;
    }

    final notesController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${action[0].toUpperCase()}${action.substring(1).toLowerCase()} Application'),
        content: TextField(
          controller: notesController,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Notes/Comments',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, notesController.text),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (result != null && mounted) {
      try {
        final repo = ref.read(loanRepositoryProvider);
        switch (action) {
          case 'VERIFY':
            await repo.verifyApplication(app.id, result);
            break;
          case 'APPROVE':
            await repo.committeeApprove(app.id, result);
            break;
          case 'REJECT':
            await repo.rejectApplication(app.id, result);
            break;
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Application ${action.toLowerCase()}ed')),
          );
          ref.invalidate(allLoanApplicationsProvider);
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
    final applicationsAsync = ref.watch(allLoanApplicationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Review Loan Application'),
      ),
      body: applicationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
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
                '${app.memberName} (${app.memberNumber})',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                app.productName,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Application Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const Divider(),
            _buildDetailRow('Principal Amount', _currencyFormat.format(app.principalAmount)),
            _buildDetailRow('Purpose', app.purpose),
            _buildDetailRow('Term', '${app.termWeeks} weeks'),
            _buildDetailRow('Applied On', _dateFormat.format(DateTime.parse(app.createdAt))),
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

  Widget _buildGuarantorsSection(LoanApplication app) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Guarantors',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (app.guarantors.isEmpty)
          const Text('No guarantors for this application.')
        else
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
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildActionButtons(LoanApplication app) {
    final status = app.status.toUpperCase();
    
    if (status == 'PENDING') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ElevatedButton(
            onPressed: () => _performAction('VERIFY', app),
            child: const Text('Verify Application'),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => _performAction('REJECT', app),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.negative),
            child: const Text('Reject'),
          ),
        ],
      );
    }
    
    if (status == 'VERIFIED') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ElevatedButton(
            onPressed: () => _performAction('APPROVE', app),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.positive, foregroundColor: Colors.white),
            child: const Text('Committee Approve'),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => _performAction('REJECT', app),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.negative),
            child: const Text('Reject'),
          ),
        ],
      );
    }

    if (status == 'APPROVED') {
      return ElevatedButton(
        onPressed: () => _performAction('DISBURSE', app),
        style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade800, foregroundColor: Colors.white),
        child: const Text('Disburse Loan Funds'),
      );
    }

    return const SizedBox.shrink();
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
