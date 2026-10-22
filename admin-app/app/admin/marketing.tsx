import React, {useState} from "react";
import {ScrollView,View,Text,TextInput,StyleSheet} from "react-native";
export default function MarketingCRM(){
 const [message,setMessage]=useState("");
 return <ScrollView contentContainerStyle={s.page}>
 <Text style={s.title}>Raha Marketing CRM</Text>
 <View style={s.card}><Text style={s.heading}>Bulk SMS Campaign</Text>
 <Text>Approved SMS template (draft)</Text>
 <TextInput multiline value={message} onChangeText={setMessage} maxLength={500} style={s.input} placeholder="Write SMS draft"/>
 <Text>{message.length}/500 characters</Text>
 <Text style={s.warning}>SMS sending is disabled until DLT, gateway, admin authorization and customer consent are configured.</Text></View>
 <View style={s.card}><Text style={s.heading}>Customer Audience</Text><Text>Firestore sync pending. No verified recipient count available yet.</Text></View>
 </ScrollView>
}
const s=StyleSheet.create({page:{padding:24,backgroundColor:"#F6F8FC",flexGrow:1,gap:16},title:{fontSize:26,fontWeight:"800",color:"#082F5B"},card:{backgroundColor:"#fff",borderRadius:14,padding:18,gap:12},heading:{fontSize:18,fontWeight:"700"},input:{borderWidth:1,borderColor:"#CBD5E1",borderRadius:8,minHeight:120,padding:12,textAlignVertical:"top"},warning:{color:"#9A4B00"}});
