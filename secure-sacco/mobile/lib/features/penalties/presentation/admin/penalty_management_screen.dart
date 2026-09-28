import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import 'admin_penalties_tab.dart';
import 'penalty_rules_tab.dart';

class PenaltyManagementScreen extends ConsumerStatefulWidget {
  const PenaltyManagementScreen({super.key});

  @override
  ConsumerState<PenaltyManagementScreen> createState() => _PenaltyManagementScreenState();
}

class _PenaltyManagementScreenState extends ConsumerState<PenaltyManagementScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Penalty Management'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Member Penalties'),
            Tab(text: 'Penalty Rules'),
          ],
        ),
      ),
      backgroundColor: AppColors.background,
      body: TabBarView(
        controller: _tabController,
        children: const [
          AdminPenaltiesTab(),
          PenaltyRulesTab(),
        ],
      ),
    );
  }
}
