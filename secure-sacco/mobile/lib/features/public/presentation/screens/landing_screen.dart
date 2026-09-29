import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';
import '../../data/public_providers.dart';
import '../../data/public_models.dart';
import 'package:url_launcher/url_launcher.dart';

class LandingScreen extends ConsumerStatefulWidget {
  const LandingScreen({super.key});

  @override
  ConsumerState<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends ConsumerState<LandingScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _scrolled = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      if (_scrollController.offset > 50 && !_scrolled) {
        setState(() => _scrolled = true);
      } else if (_scrollController.offset <= 50 && _scrolled) {
        setState(() => _scrolled = false);
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(landingDataProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF7),
      body: asyncData.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (error, stackTrace) => ErrorStateView.network(
          onRetry: () => ref.invalidate(landingDataProvider),
        ),
        data: (data) => _buildBody(data),
      ),
    );
  }

  Widget _buildBody(LandingPageData data) {
    return CustomScrollView(
      controller: _scrollController,
      slivers: [
        _buildSliverAppBar(data.profile),
        SliverToBoxAdapter(
          child: _buildHero(data),
        ),
        SliverToBoxAdapter(
          child: _buildTrustStrip(),
        ),
        if (data.profile?.history?.isNotEmpty == true || 
            data.profile?.mission?.isNotEmpty == true || 
            data.profile?.vision?.isNotEmpty == true)
          SliverToBoxAdapter(
            child: _buildAbout(data.profile!),
          ),
        if (data.memberSpotlights.isNotEmpty)
          SliverToBoxAdapter(
            child: _buildSpotlights(data.memberSpotlights),
          ),
        SliverToBoxAdapter(
          child: _buildMeetings(data.upcomingMeetings),
        ),
        if (data.announcements.isNotEmpty)
          SliverToBoxAdapter(
            child: _buildAnnouncements(data.announcements),
          ),
        SliverToBoxAdapter(
          child: _buildDocuments(data.documents),
        ),
        if (data.profile != null && (data.profile!.contactPhone?.isNotEmpty == true || data.profile!.contactEmail?.isNotEmpty == true || data.profile!.contactAddress?.isNotEmpty == true))
          SliverToBoxAdapter(
            child: _buildContact(data.profile!),
          ),
        SliverToBoxAdapter(
          child: _buildCTA(),
        ),
        SliverToBoxAdapter(
          child: _buildFooter(data.profile),
        ),
      ],
    );
  }

  Widget _buildSliverAppBar(SaccoProfile? profile) {
    final name = profile?.saccoName?.trim() ?? '';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'S';

    return SliverAppBar(
      pinned: true,
      backgroundColor: _scrolled ? const Color(0xFF0B0F1E).withAlpha(245) : Colors.transparent,
      elevation: _scrolled ? 4 : 0,
      title: Row(
        children: [
          if (profile?.logoUrl?.isNotEmpty == true)
            Image.network(profile!.logoUrl!, height: 38, width: 38, fit: BoxFit.contain)
          else
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFC9A84C), Color(0xFFB8962E)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  initial,
                  style: const TextStyle(
                    fontFamily: 'Playfair Display',
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0B0F1E),
                    fontSize: 16,
                  ),
                ),
              ),
            ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  height: 1.2,
                ),
              ),
              if (profile?.foundedYear != null)
                Text(
                  'Est. ${profile!.foundedYear}',
                  style: const TextStyle(
                    color: Color(0xFFC9A84C),
                    fontSize: 10,
                    letterSpacing: 1.0,
                    textBaseline: TextBaseline.alphabetic,
                  ),
                ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => context.push('/login'),
          style: TextButton.styleFrom(
            backgroundColor: const Color(0xFFC9A84C),
            foregroundColor: const Color(0xFF0B0F1E),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          child: const Text(
            'USER LOGIN',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 12,
              letterSpacing: 0.5,
            ),
          ),
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildHero(LandingPageData data) {
    final name = data.profile?.saccoName?.trim() ?? '';
    final tagline = data.profile?.tagline?.trim() ?? 'Built on trust. Growing through unity.';
    final yearsActive = data.profile?.foundedYear != null ? DateTime.now().year - data.profile!.foundedYear! : 0;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 60, 20, 40),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0B0F1E), Color(0xFF111827), Color(0xFF0D1520)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 2,
                height: 40,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFC9A84C), Colors.transparent],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                data.profile?.foundedYear != null ? 'MEMBER-OWNED · SINCE ${data.profile!.foundedYear}' : 'MEMBER-OWNED · NAIROBI, KENYA',
                style: const TextStyle(
                  color: Color(0xFFC9A84C),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            name,
            style: const TextStyle(
              fontFamily: 'Playfair Display',
              fontSize: 42,
              color: Colors.white,
              fontWeight: FontWeight.bold,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            tagline,
            style: const TextStyle(
              fontFamily: 'Playfair Display',
              fontSize: 20,
              color: Color(0xBBC9A84C),
              fontStyle: FontStyle.italic,
            ),
          ),
          const SizedBox(height: 24),
          if (data.profile?.mission?.isNotEmpty == true)
            Text(
              data.profile!.mission!,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 15,
                height: 1.5,
              ),
            ),
          const SizedBox(height: 36),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withAlpha(10),
              border: Border.all(color: const Color(0xFFC9A84C).withAlpha(34)),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              children: [
                _buildStatRow('Active Members', data.memberCount.toString(), 'Meetings Held', data.meetingsHeld.toString()),
                const Divider(color: Colors.white24, height: 40),
                _buildStatRow('Documents', data.totalDocuments.toString(), 'Years Active', yearsActive.toString()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label1, String val1, String label2, String val2) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                val1,
                style: const TextStyle(
                  fontFamily: 'Playfair Display',
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFC9A84C),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label1.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                val2,
                style: const TextStyle(
                  fontFamily: 'Playfair Display',
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFC9A84C),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label2.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTrustStrip() {
    return Container(
      color: const Color(0xFFF4F1EB),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            const Text(
              'WHY TRUST US',
              style: TextStyle(
                color: Color(0xFF9A9488),
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(width: 16),
            Container(width: 1, height: 20, color: const Color(0xFFD8D4C8)),
            const SizedBox(width: 16),
            _buildTrustItem(Icons.shield_outlined, 'Member-owned cooperative'),
            _buildTrustItem(Icons.lock_outline, 'Secure & transparent'),
            _buildTrustItem(Icons.description_outlined, 'Fully documented records'),
            _buildTrustItem(Icons.handshake_outlined, 'Community-first values'),
          ],
        ),
      ),
    );
  }

  Widget _buildTrustItem(IconData icon, String label) {
    return Padding(
      padding: const EdgeInsets.only(right: 24),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF6B6560)),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF6B6560),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRule(String text) {
    return Row(
      children: [
        Container(width: 24, height: 1, color: const Color(0xFFC9A84C)),
        const SizedBox(width: 10),
        Text(
          text.toUpperCase(),
          style: const TextStyle(
            color: Color(0xFFC9A84C),
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildAbout(SaccoProfile profile) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildRule('About Us'),
          const SizedBox(height: 8),
          const Text(
            'Who We Are',
            style: TextStyle(
              fontFamily: 'Playfair Display',
              fontSize: 28,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 24),
          if (profile.history?.isNotEmpty == true)
            Container(
              padding: const EdgeInsets.all(24),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE8E4D8)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Our History', style: TextStyle(fontFamily: 'Playfair Display', fontSize: 19, color: Color(0xFF1A1A1A))),
                  const SizedBox(height: 12),
                  Text(profile.history!, style: const TextStyle(color: Color(0xFF6B6560), height: 1.5)),
                ],
              ),
            ),
          if (profile.mission?.isNotEmpty == true)
            Container(
              padding: const EdgeInsets.all(24),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF0B0F1E),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('🎯', style: TextStyle(fontSize: 24)),
                  const SizedBox(height: 12),
                  const Text('Mission', style: TextStyle(fontFamily: 'Playfair Display', fontSize: 19, color: Colors.white)),
                  const SizedBox(height: 12),
                  Text(profile.mission!, style: const TextStyle(color: Colors.white70, height: 1.5)),
                ],
              ),
            ),
          if (profile.vision?.isNotEmpty == true)
            Container(
              padding: const EdgeInsets.all(24),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFC9A84C), Color(0xFFB8962E)],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('🔭', style: TextStyle(fontSize: 24)),
                  const SizedBox(height: 12),
                  const Text('Vision', style: TextStyle(fontFamily: 'Playfair Display', fontSize: 19, color: Color(0xFF0B0F1E))),
                  const SizedBox(height: 12),
                  Text(profile.vision!, style: const TextStyle(color: Color(0xFF0B0F1E), height: 1.5)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSpotlights(List<MemberSpotlight> spotlights) {
    return Container(
      padding: const EdgeInsets.all(24),
      color: const Color(0xFFF4F1EB),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildRule('Our Community'),
          const SizedBox(height: 8),
          const Text(
            'Meet Our Members',
            style: TextStyle(
              fontFamily: 'Playfair Display',
              fontSize: 28,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 300,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: spotlights.length,
              itemBuilder: (context, index) {
                final s = spotlights[index];
                return Container(
                  width: 250,
                  margin: const EdgeInsets.only(right: 16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    image: DecorationImage(
                      image: NetworkImage(s.photoUrl),
                      fit: BoxFit.cover,
                    ),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withAlpha(200)],
                      ),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.displayName,
                          style: const TextStyle(
                            fontFamily: 'Playfair Display',
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          s.roleTitle,
                          style: const TextStyle(
                            color: Color(0xFFC9A84C),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMeetings(List<UpcomingMeeting> meetings) {
    return Container(
      padding: const EdgeInsets.all(24),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildRule('Schedule'),
          const SizedBox(height: 8),
          const Text(
            'Upcoming Meetings',
            style: TextStyle(
              fontFamily: 'Playfair Display',
              fontSize: 28,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 24),
          if (meetings.isEmpty)
            Container(
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                color: const Color(0xFFF9F7F4),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFC9A84C).withAlpha(100), style: BorderStyle.solid),
              ),
              alignment: Alignment.center,
              child: const Column(
                children: [
                  Text('📅', style: TextStyle(fontSize: 36)),
                  SizedBox(height: 14),
                  Text('No upcoming meetings scheduled', style: TextStyle(color: Color(0xFF9A9488), fontWeight: FontWeight.bold)),
                ],
              ),
            )
          else
            ...meetings.map((m) => _buildMeetingCard(m, meetings.first == m)),
        ],
      ),
    );
  }

  Widget _buildMeetingCard(UpcomingMeeting m, bool featured) {
    final start = DateTime.parse(m.startAt);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8E4D8)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            color: featured ? const Color(0xFFC9A84C) : const Color(0xFF0B0F1E),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m.meetingType,
                      style: TextStyle(
                        color: featured ? const Color(0xFF0B0F1E).withAlpha(128) : Colors.white70,
                        fontSize: 10,
                        letterSpacing: 1.0,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      DateFormat('dd').format(start),
                      style: TextStyle(
                        fontFamily: 'Playfair Display',
                        fontSize: 36,
                        color: featured ? const Color(0xFF0B0F1E) : Colors.white,
                        fontWeight: FontWeight.bold,
                        height: 1.2,
                      ),
                    ),
                    Text(
                      DateFormat('MMMM yyyy').format(start),
                      style: TextStyle(
                        color: featured ? const Color(0xFF0B0F1E).withAlpha(150) : Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'TIME (EAT)',
                      style: TextStyle(
                        color: featured ? const Color(0xFF0B0F1E).withAlpha(128) : Colors.white70,
                        fontSize: 10,
                        letterSpacing: 1.0,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      DateFormat('HH:mm').format(start),
                      style: TextStyle(
                        fontFamily: 'Playfair Display',
                        fontSize: 20,
                        color: featured ? const Color(0xFF0B0F1E) : Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(20),
            color: Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  m.title,
                  style: const TextStyle(
                    fontFamily: 'Playfair Display',
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  m.description,
                  style: const TextStyle(
                    color: Color(0xFF9A9488),
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFFC9A84C), shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    const Text('SCHEDULED', style: TextStyle(color: Color(0xFFC9A84C), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnnouncements(List<PublicAnnouncement> announcements) {
    return Container(
      padding: const EdgeInsets.all(24),
      color: const Color(0xFFFAFAF7),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildRule('Latest'),
          const SizedBox(height: 8),
          const Text(
            'Announcements',
            style: TextStyle(
              fontFamily: 'Playfair Display',
              fontSize: 28,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 24),
          ...announcements.map((a) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE8E4D8)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 3,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC9A84C),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              a.title,
                              style: const TextStyle(
                                fontFamily: 'Playfair Display',
                                fontSize: 17,
                                color: Color(0xFF1A1A1A),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          Text(
                            DateFormat('dd MMM yyyy').format(DateTime.parse(a.createdAt)),
                            style: const TextStyle(
                              color: Color(0xFFB8B2AB),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        a.body,
                        style: const TextStyle(
                          color: Color(0xFF6B6560),
                          fontSize: 13,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildDocuments(List<PublicDocument> documents) {
    return Container(
      padding: const EdgeInsets.all(24),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildRule('Resources'),
          const SizedBox(height: 8),
          const Text(
            'Documents & Minutes',
            style: TextStyle(
              fontFamily: 'Playfair Display',
              fontSize: 28,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 24),
          if (documents.isEmpty)
             Container(
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                color: const Color(0xFFF9F7F4),
                borderRadius: BorderRadius.circular(14),
              ),
              alignment: Alignment.center,
              child: const Text('No documents available', style: TextStyle(color: Color(0xFF9A9488))),
            )
          else
            ...documents.map((d) {
              Color bg = const Color(0xFFF4F1EB);
              Color fg = const Color(0xFF6B6560);
              String label = 'General';
              if (d.category == 'MEETING_MINUTES') {
                bg = const Color(0xFFEFF6FF); fg = const Color(0xFF1D4ED8); label = 'Minutes';
              } else if (d.category == 'NOTICE') {
                bg = const Color(0xFFFFFBEB); fg = const Color(0xFFB45309); label = 'Notice';
              } else if (d.category == 'FINANCIAL_REPORT') {
                bg = const Color(0xFFF0FDF4); fg = const Color(0xFF15803D); label = 'Finance';
              } else if (d.category == 'POLICY') {
                bg = const Color(0xFFF5F3FF); fg = const Color(0xFF6D28D9); label = 'Policy';
              }
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE8E4D8)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
                      alignment: Alignment.center,
                      child: const Text('📄', style: TextStyle(fontSize: 18)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  d.title,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1A1A1A)),
                                  maxLines: 1, overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
                                child: Text(label, style: TextStyle(color: fg, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            (d.meetingDate != null ? 'Meeting: ${DateFormat('dd MMM yyyy').format(DateTime.parse(d.meetingDate!))} · ' : '') + 
                            'Posted ${DateFormat('dd MMM yyyy').format(DateTime.parse(d.createdAt))}',
                            style: const TextStyle(color: Color(0xFFB8B2AB), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.download, color: Color(0xFF0B0F1E)),
                      onPressed: () async {
                        final uri = Uri.parse(d.fileUrl);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri);
                        }
                      },
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildContact(SaccoProfile profile) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0B0F1E), Color(0xFF111827)],
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 24, height: 1, color: const Color(0xFFC9A84C)),
              const SizedBox(width: 10),
              const Text('GET IN TOUCH', style: TextStyle(color: Color(0xFFC9A84C), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Contact Us', style: TextStyle(fontFamily: 'Playfair Display', fontSize: 28, color: Colors.white)),
          const SizedBox(height: 12),
          const Text('Questions about membership or our services? Reach out directly.', style: TextStyle(color: Colors.white54, fontSize: 13), textAlign: TextAlign.center),
          const SizedBox(height: 24),
          if (profile.contactPhone?.isNotEmpty == true)
            _buildContactItem('📞', 'PHONE', profile.contactPhone!),
          if (profile.contactEmail?.isNotEmpty == true)
            _buildContactItem('✉️', 'EMAIL', profile.contactEmail!),
          if (profile.contactAddress?.isNotEmpty == true)
            _buildContactItem('📍', 'LOCATION', profile.contactAddress!),
        ],
      ),
    );
  }

  Widget _buildContactItem(String icon, String label, String text) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFC9A84C).withAlpha(34)),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: const Color(0xFFC9A84C).withAlpha(30), borderRadius: BorderRadius.circular(10)),
            alignment: Alignment.center,
            child: Text(icon, style: const TextStyle(fontSize: 18)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Color(0xFFC9A84C), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                const SizedBox(height: 4),
                Text(text, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCTA() {
    return Container(
      padding: const EdgeInsets.all(40),
      color: const Color(0xFFF4F1EB),
      alignment: Alignment.center,
      child: Column(
        children: [
          const Text(
            'Ready to join the SACCO?',
            style: TextStyle(fontFamily: 'Playfair Display', fontSize: 24, color: Color(0xFF1A1A1A)),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'Log in to the member portal to manage savings, apply for loans, and stay informed.',
            style: TextStyle(color: Color(0xFF9A9488), fontSize: 13),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.push('/login'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC9A84C),
              foregroundColor: const Color(0xFF0B0F1E),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Access Member Portal →', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter(SaccoProfile? profile) {
    final name = profile?.saccoName?.trim() ?? '';
    return Container(
      padding: const EdgeInsets.all(24),
      color: const Color(0xFF070B14),
      child: Column(
        children: [
          Text(
            name,
            style: const TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text(
            '© ${DateTime.now().year} $name',
            style: const TextStyle(color: Colors.white24, fontSize: 10),
          ),
        ],
      ),
    );
  }
}
