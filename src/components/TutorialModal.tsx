import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView
} from 'react-native';
import {
  X,
  Scale,
  Wind,
  MapPin,
  Layers,
  Save,
  TrendingUp
} from 'lucide-react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const TutorialModal = ({ visible, onClose }: Props) => {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'white', borderRadius: 24, width: 340, paddingVertical: 24, height: '75%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>LobsterLog Guide</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>

            <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
              <View style={{ height: 160, width: '100%', backgroundColor: '#EFF6FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Scale size={64} color="#3B82F6" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>1. The Daily Log</Text>
              <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                Start your day on the <Text style={{ fontWeight: 'bold' }}>Log Screen</Text>. Enter your total pounds and market price here.
                {"\n\n"}
                This keeps a historical log, so you can look back through the years, and season totals automatically.
              </Text>
            </View>

            <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
              <View style={{ height: 160, width: '100%', backgroundColor: '#E0F2FE', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Wind size={64} color="#0EA5E9" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>2. Automatic Weather</Text>
              <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                Stop guessing the wind speed.
                {"\n\n"}
                The app automatically fetches the <Text style={{ fontWeight: 'bold' }}>Wind, Temp, and Direction</Text> for your specific location every time you save a log.
              </Text>
            </View>

            <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
              <View style={{ height: 160, width: '100%', backgroundColor: '#F0FDF4', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <MapPin size={64} color="#22C55E" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>3. Active vs. History</Text>
              <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                <Text style={{ fontWeight: 'bold' }}>White Lines</Text> are gear currently in the water (Active).
                {"\n\n"}
                <Text style={{ fontWeight: 'bold' }}>Colored Lines</Text> appear on the Heatmap after you haul them (History).
              </Text>
            </View>

            <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
              <View style={{ height: 160, width: '100%', backgroundColor: '#FEF2F2', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Layers size={64} color="#EF4444" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>4. The "Swap" Cycle</Text>
              <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                When you log a trawl on the map, the app does two things instantly:
                {"\n\n"}
                1. It <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>HAULS</Text> the old string (moves it to History).
                {"\n"}
                2. It <Text style={{ fontWeight: 'bold', color: '#22C55E' }}>SETS</Text> the new string at your current spot.
              </Text>
            </View>

            <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
              <View style={{ height: 160, width: '100%', backgroundColor: '#FFF7ED', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Save size={64} color="#F97316" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>5. Entering Data</Text>
              <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                Because of the swap logic, remember:
                {"\n\n"}
                <Text style={{ fontWeight: 'bold' }}>Catch:</Text> Enter what was in the trap you JUST hauled up.
                {"\n"}
                <Text style={{ fontWeight: 'bold' }}>Bait:</Text> Enter the bait for the trap you are setting RIGHT NOW.
              </Text>
            </View>

            <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
              <View style={{ height: 160, width: '100%', backgroundColor: '#F5F3FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <TrendingUp size={64} color="#8B5CF6" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>6. Pro Insights</Text>
              <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                Toggle the <Text style={{ fontWeight: 'bold' }}>Heatmap</Text> to see your past performance.
                {"\n\n"}
                Red lines = High Catch.
                {"\n"}
                Use this to plan where to set your gear next season.
              </Text>
            </View>

          </ScrollView>

          <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 15 }}>SWIPE FOR MORE →</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#0F172A', paddingVertical: 16, width: '100%', borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Got it, Let's Fish</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

export default TutorialModal;