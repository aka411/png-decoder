



function pngDecode(PNG)
{




/**********************
GLOBAL VARIABLE AREA
**********************/


var Global_byte_index=8;

var Global_bit_index =0;//mostly not needed

var Chunk_length=0;

var Chunk_type=0;

var Palette= new Uint8Array(256*3);
/******************/




function Bite_reader(Length_to_read)
{
var Result=0;

for(let i=1;i<=Length_to_read;i++)
{
Result+=PNG[Global_byte_index+(Length_to_read-i)]<<(8*(i-1));

}

Global_byte_index+=Length_to_read;
return Result;
}


/******************/




  //Initialize//
/*****************/



//SIGNATURE CHECK COMES HERE

let Ihdr_length=Bite_reader(4);

Global_byte_index+=4;


/*******************************
Global Image Property Variables
******************************/

const Width=Bite_reader(4);
const Height=Bite_reader(4);
const Bit_depth=Bite_reader(1);
const Color_type=Bite_reader(1);
const Compression_method=Bite_reader(1);
const Filter_method=Bite_reader(1);
const Interlace_method=Bite_reader(1);

var Components_per_pixel=0;






/***********************
***********************/

switch(Color_type)
{
 case 0://Greyscale
 Components_per_pixel=1;
break;
 case 2://RGB
 Components_per_pixel=3;
break;
 case 3://Palette
Components_per_pixel=1;
break;
 case 4://Greyscale with Alpha
Components_per_pixel=2;
break;
 case 6://RGBA
Components_per_pixel=4;
break;
}








var IMAGE_DATA= new Uint8Array((Width*Height*(Components_per_pixel))+Height);

//Global_byte_index+=3;//skip unused bytes

Global_byte_index+=4;//skip crc



/********************
FUNCTION AREA
*********************/



function Skip_header()
{
Global_byte_index+=(Chunk_length+4);
}



//For PNG with palette
function Read_Palette()
{
for(let i=0;i<Chunk_length;i++)
{
Palette[i]=PNG[Global_byte_index];
Global_byte_index++;
}
Global_byte_index+=4;


}









/********************
DECODING AND DECOMPRESSING AREA
*********************/

function Zlib_decoder(Zlib_block)
{





var Global_zlib_byte_index=0;
var Global_zlib_bit_index =0;





/****************
FUNCTION AREA
*****************/
function Bit_reader(n)
{
var result=0;
var initial_bit_position=Global_zlib_bit_index;
for(let i=0;i<n;i++)
{
result+=(((Zlib_block[Global_zlib_byte_index])&(0x01<<Global_zlib_bit_index))>>Global_zlib_bit_index)<<(i);


Global_zlib_bit_index++;
if(Global_zlib_bit_index==8)
{
Global_zlib_byte_index++;
Global_zlib_bit_index=0;
}
}

return  result;

}





function Zlib_byte_reader(Length_to_read)
{
var Result=0;

for(let i=1;i<=Length_to_read;i++)
{
Result+=Zlib_block[Global_zlib_byte_index+(Length_to_read-i)]<<(8*(i-1));

}

Global_zlib_byte_index+=Length_to_read;
return Result;
}





function Read_lengths(n)
{
var Result=new Uint8Array(n);
for(let i=0;i<n;i++)
{

Result[i]=Bit_reader(3);
}


return Result;

}








/*******************
DECODING AREA
********************/







/*##################
      DEFLATE
###################*/
function DEFLATE()
{

/**************
GLOBAL VARIABLES
**************/
var  Bfinal=0;
var  Btype = 0;
var  Image_data_fill_index=0;
/**************
GLOBAL VARIABLES
**************/







function sort_first_lengths(Lengths,Hclen)
{
var Result=new Uint8Array(19);
var First_alphabets=new Uint8Array([16, 17, 18,0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1,15]);
for(let i=0;i<19;i++)
{
Result[i]=0;

}

for(let i=0;i<Hclen;i++)
{

Result[First_alphabets[i]]=Lengths[i];

}


return Result;
}


function Get_counts(Lengths,Num_of_items)
{



var Max_bit_len=0;
var Count=new Uint16Array(19);

for(let i=0;i<19;i++){Count[i]=0;}//fill with zero

for(let i=0;i<Num_of_items;i++)

{
Count[Lengths[i]]++;
if(Max_bit_len<Lengths[i]){Max_bit_len=Lengths[i];}
}
Count[0]=Max_bit_len;


return Count;
}



function Generate_and_assign_huffman_codes(Alphabet,Counts,Alphabet_total_count)
{





function Reverse_codes(code,code_len_count,count)
{

var result= new Uint32Array(count).fill(0);
var bit=0;
var k=0;
var Max_bit_len=code_len_count[0];
for(let i=1;i<=Max_bit_len;i++){



for(let h=0;h<code_len_count[i];h++){

for(let j=0;j<i;j++){



bit=((code[k]& 0x01<<(i-j-1))!=0)?1:0;




result[k]+= bit<<j;


}
k++;
}

}


return result;
}








var Total_count=0;
for(let i=0;i<=Counts[0];i++){Total_count+=Counts[i];}

var Generated_codes=new Uint32Array(Total_count+1);
var k=0;

for(let i=0;i<=Total_count;i++){Generated_codes[i]=0;}
for(let i=1;i<=Counts[0];i++)//Max_bit_len
{
for(let j=0;j<Counts[i];j++)
{
Generated_codes[k+1]=Generated_codes[k]+1;
k++;
}

Generated_codes[k]=Generated_codes[k]<<1;

}
//one extra code is generated




//remove


var Reversed_generated_codes=new Uint32Array(Reverse_codes(Generated_codes,Counts,Total_count));



var Assigned_codes=new Uint32Array(Alphabet_total_count);
var Generated_code_index=0;

for(let i=1;i<=Counts[0];i++)
{


for(let j=0;Counts[i]>0;j++)
{

if(Alphabet[j]==i){Assigned_codes[j]=Reversed_generated_codes[Generated_code_index++];Counts[i]--;}


}

}



return Assigned_codes;

}






function Decode(code,code_len,Total_count)//alphabet,mode
{


var temp_arr_index=0;
var temp_bit_index=0;






function Huffman_bit_reader(bits_to_read){

temp_arr_index=Global_zlib_byte_index;

temp_bit_index=Global_zlib_bit_index;

let result=0;
let R1=0;




for (let i=0;i<bits_to_read;i++){

R1=((Zlib_block[temp_arr_index]&0x01<<temp_bit_index)!=0)?1:0;

result+= R1<<i;


temp_bit_index++;

if (temp_bit_index==8){
temp_arr_index++;
temp_bit_index=0;}
}


return result;
}


for(let i=0;i<Total_count;i++){

if(( code_len[i]!=0) && (code[i]==Huffman_bit_reader(code_len[i])))
{





Global_zlib_byte_index=temp_arr_index;
Global_zlib_bit_index=temp_bit_index;



return i;


}


}

return 666;


}






function Second_decode(Literal_length_huffman_code,Distance_huffman_code,Literal_n_Length_code_len,Distance_code_len,HLIT,HDIST)
{


var base_length_extra_bit =new Uint8Array( [
    0, 0, 0, 0, 0, 0, 0, 0, //257 - 264
    1, 1, 1, 1, //265 - 268
    2, 2, 2, 2, //269 - 273
    3, 3, 3, 3, //274 - 276
    4, 4, 4, 4, //278 - 280
    5, 5, 5, 5, //281 - 284
    0           //285
]);

var base_lengths =new Uint32Array( [
    3, 4, 5, 6, 7, 8, 9, 10, //257 - 264
    11, 13, 15, 17,          //265 - 268
    19, 23, 27, 31,          //269 - 273
    35, 43, 51, 59,          //274 - 276
    67, 83, 99, 115,         //278 - 280
    131, 163, 195, 227,      //281 - 284
    258                      //285
]);



var dist_bases = new Uint32Array([
    /*0*/ 1, 2, 3, 4,    //0-3
    /*1*/ 5, 7,          //4-5
    /*2*/ 9, 13,         //6-7
    /*3*/ 17, 25,        //8-9
    /*4*/ 33, 49,        //10-11
    /*5*/ 65, 97,        //12-13
    /*6*/ 129, 193,      //14-15
    /*7*/ 257, 385,      //16-17
    /*8*/ 513, 769,      //18-19
    /*9*/ 1025, 1537,    //20-21
    /*10*/ 2049, 3073,   //22-23
    /*11*/ 4097, 6145,   //24-25
    /*12*/ 8193, 12289,  //26-27
    /*13*/ 16385, 24577  //28-29
      ,  0   , 0      //30-31, error, shouldn't occur
]);



var dist_extra_bits = new Uint32Array([
    /*0*/ 0, 0, 0, 0, //0-3
    /*1*/ 1, 1,       //4-5
    /*2*/ 2, 2,       //6-7
    /*3*/ 3, 3,       //8-9
    /*4*/ 4, 4,       //10-11
    /*5*/ 5, 5,       //12-13
    /*6*/ 6, 6,       //14-15
    /*7*/ 7, 7,       //16-17
    /*8*/ 8, 8,       //18-19
    /*9*/ 9, 9,       //20-21
    /*10*/ 10, 10,    //22-23
    /*11*/ 11, 11,    //24-25
    /*12*/ 12, 12,    //26-27
    /*13*/ 13, 13     //28-29
      ,  0 , 0      //30-31 error, they shouldn't occur
]);








function Back_pointer(dec_value)
{

var back_length=0;
var distance_decoded_index=0;
var back_distance=0;


back_length= base_lengths[dec_value-257]+Bit_reader(base_length_extra_bit[dec_value-257]);



distance_decoded_index=Decode(Distance_huffman_code,Distance_code_len,HDIST);




back_distance=dist_bases[distance_decoded_index]+Bit_reader(dist_extra_bits[ distance_decoded_index ] );

for(let i = 0;i<back_length;i++)
 {


IMAGE_DATA[Image_data_fill_index]=IMAGE_DATA[Image_data_fill_index-back_distance];
Image_data_fill_index++;

 }

}








while (1==1){


second_decoded_value=Decode(Literal_length_huffman_code, Literal_n_Length_code_len,HLIT);

if(second_decoded_value<256){

IMAGE_DATA[Image_data_fill_index++]=second_decoded_value;
 continue;
   }

if(second_decoded_value==256){break;}





Back_pointer(second_decoded_value);

}


}
















/*##################
  DEFLATE DECODING
###################*/




function Raw_block()
{



if (Global_zlib_bit_index>0)
{
Global_zlib_bit_index=0;
Global_zlib_byte_index++;
}
var Len=Zlib_byte_reader(2);
var Nlen=Zlib_byte_reader(2);
if((Len&&Nlen)>0){return 9;}
for(let i=0;i<Len;i++)
{
IMAGE_DATA[Image_data_fill_index++]=Zlib_block[Global_zlib_byte_index++];
}


}







function Static_block()
{




var Lit_len=new Uint32Array(288);
var index=0;
for(let i=0;i<=143;i++){Lit_len[index++]=8;}
for(let i=144;i<=255;i++){Lit_len[index++]=9;}
for(let i=256;i<=279;i++){Lit_len[index++]=7;}
for(let i=280;i<=287;i++){Lit_len[index++]=8;}

var Literal_length_code_len=new Uint32Array(Lit_len);
var Literal_length_counts=new Uint16Array(Get_counts(Literal_length_code_len,285));
var Literal_Length_codes=new Uint32Array(Generate_and_assign_huffman_codes(Literal_length_code_len,Literal_length_counts,286));


var Distance_code_len=new Uint32Array([5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]);//save time 30(0-29)
var Distance_counts=new Uint16Array(Get_counts(Distance_code_len,30));
var Distance_codes=new Uint32Array(Generate_and_assign_huffman_codes(Distance_code_len,Distance_counts,30));




Second_decode(Literal_Length_codes,Distance_codes,Literal_length_code_len,Distance_code_len,286,30);

}







function Dynamic_block()
{


var HLIT =Bit_reader(5);
HLIT+=257;
var HDIST=Bit_reader(5);
HDIST+=1;
var HCLEN=Bit_reader(4);
HCLEN+=4;

var First_code_length=new Uint8Array(sort_first_lengths(Read_lengths(HCLEN),HCLEN));

var First_code_len_counts= new Uint8Array(Get_counts(First_code_length,19));
//format counts[0]=max bit length

//remove


var First_tree_assigned_codes=new Uint32Array(Generate_and_assign_huffman_codes(First_code_length,First_code_len_counts,19));








var  Second_huffman_code_lengths= new Uint32Array(HLIT+HDIST);
let decoded_value=0;
let code_index=0;
let repeat_count=0,code_length_to_repeat=0;

function  To_repeat(len,n){

for(let p=0;p<n;p++){

Second_huffman_code_lengths[code_index++]=len;



}


}






while(code_index<HLIT+HDIST)
{

decoded_value=Decode(First_tree_assigned_codes,First_code_length,19);

if(decoded_value<16){
Second_huffman_code_lengths[code_index++]=decoded_value;//post incremented index


continue;
}




repeat_count=0;
code_length_to_repeat=0;

switch(decoded_value){

case 16:

code_length_to_repeat=Second_huffman_code_lengths[code_index-1];
repeat_count=Bit_reader(2)+3;
break;

case 17:

code_length_to_repeat=0;
repeat_count=Bit_reader(3)+3;

break;

case 18:
code_length_to_repeat=0;
repeat_count=Bit_reader(7)+11;
break

}



To_repeat(code_length_to_repeat,repeat_count);



}





var Literal_length_code_len=new Uint32Array(Second_huffman_code_lengths.slice(0,HLIT));
var Literal_length_counts=new Uint16Array(Get_counts(Literal_length_code_len,HLIT));
var Literal_Length_codes=new Uint32Array(Generate_and_assign_huffman_codes(Literal_length_code_len,Literal_length_counts,HLIT));


var Distance_code_len=new Uint32Array(Second_huffman_code_lengths.slice(HLIT,HLIT+HDIST));
var Distance_counts=new Uint16Array(Get_counts(Distance_code_len,HDIST));
var Distance_codes=new Uint32Array(Generate_and_assign_huffman_codes(Distance_code_len,Distance_counts,HDIST));
//second_decode





Second_decode(Literal_Length_codes,Distance_codes,Literal_length_code_len,Distance_code_len,HLIT,HDIST);



}//dynamic block end tag

















/*##################
  DEFLATE DECODING
###################*/












while(Bfinal!=1){

Bfinal=Bit_reader(1);
Btype=Bit_reader(2);

switch(Btype){

case 0x00://Raw block
Raw_block();
break;

case 0x01://Static huffman block
Static_block();
break;

case 0x02://Dynamic huffman block
Dynamic_block();
break;



default:
Bfinal=1;
break;


}


}












}

/*##################
      DEFLATE
###################*/

/******************
ZLIB HANDLER
*******************/
let CM=Bit_reader(4);
let CINFO=Bit_reader(4);
let FCHECK=Bit_reader(5);
let FDICT=Bit_reader(1);
let FLEVEL=Bit_reader(2);




if(FDICT==1)
{

let DICTID=Zlib_byte_reader(4);
}


DEFLATE();








}























//IDAT block is where the image data lies
function Concat_IDAT()
{






var fill_index=0;

var ZLIB_BLOCK= new Uint8Array(Width*Height*3);

function Fill_zlib_block()
{

for(let i=0;i<Chunk_length;i++){

ZLIB_BLOCK[fill_index]=PNG[Global_byte_index];
Global_byte_index++;
fill_index++;


}
Global_byte_index+=4;//crc skip
}





while(Chunk_type=='0x49444154')
{


Fill_zlib_block();
//Skip_header();

Chunk_length=Bite_reader(4);

Chunk_type=Bite_reader(4);

}


//compensate for reading next chunk type
Global_byte_index=Global_byte_index-8;
//need more consideration




Zlib_decoder(ZLIB_BLOCK.slice(0,fill_index));
//fill index at crc first byte

}











/******************
Header Reading Function
*******************/


function Header_reader()
{

switch(Chunk_type)
 {


case 0x49444154: //IDAT
Concat_IDAT();
break;


case 0x504C5445://PLTE

Read_Palette();
break;


case 0x70485973://pHYs

Skip_header();
break;

case 0x67414D41://gAMA

Skip_header();
break;

case 0x624B4744://bKGD

Skip_header();
break;

case 0x74524E53://tRNS

Skip_header();
break;

default:
Skip_header();//we skip headers we don't recognize

  }


}



/******************
CONTROL AREA
*******************/


while(Chunk_type!='0x49454e44')//
{



Chunk_length=Bite_reader(4);

Chunk_type=Bite_reader(4);



Header_reader();

}









var Raw_image_data=new Uint8Array(Height*Width*Components_per_pixel);




function Defilter(){

var Scanline=0;

const Remainder=Width%(8/Bit_depth);
const Pixel_padding=(Remainder==0?0:1);

const mask=[0x00,0x01,0x03,0x00,0x0F,0x00,0x00,0x00,0xFF];
var Data_index=0;


function None()
{

  if(Bit_depth==8){

  for(let i=0;i<(Width*Components_per_pixel);i++)
{

Raw_image_data[Data_index]=IMAGE_DATA[Scanline*(Width*Components_per_pixel+1)+1+i];
Data_index++;

}

  }
 else if(Bit_depth<8){
    //Bit depth less than 8 use only single sample per pixel
for(let i=0;i<((((Width-Remainder)*Bit_depth)/8));i++)
{
for(let j=((8/Bit_depth)-1);j>=0;j--){
Raw_image_data[Data_index]=(IMAGE_DATA[Scanline*((((Width-Remainder)*Bit_depth)/8)+1)+1+i]&(mask[Bit_depth]<<(Bit_depth*j)))>>(Bit_depth*j);
Data_index++;
}
}
if(Remainder!=0){

for(let j=((8/Bit_depth)-1);j>=0;j--){
Raw_image_data[Data_index]=(IMAGE_DATA[Scanline*((((Width-Remainder)*Bit_depth)/8)+1)+1+i]&(mask[Bit_depth]<<(Bit_depth*j)))>>(Bit_depth*j);
Data_index++;
}

}
}
}









/********/
function Sub()
{




for(let i=0;i<Components_per_pixel;i++)
{

Raw_image_data[Data_index]=IMAGE_DATA[Scanline*(Width*Components_per_pixel+1)+1+i];
Data_index++;
}



for(let i=Components_per_pixel;i<(Width*Components_per_pixel);i++)
{


Raw_image_data[Data_index]=Raw_image_data[Data_index-Components_per_pixel]+IMAGE_DATA[(Scanline*(Width*Components_per_pixel+1))+1+i];
Data_index++;
}

}





function Up()
{




if(Scanline==0){
for(let i=0;i<Components_per_pixel;i++)
{

Raw_image_data[Data_index]=0+IMAGE_DATA[((Scanline)*Width*Components_per_pixel+1)+1+i];
Data_index++;
}
}



for(let i=0;i<(Width*Components_per_pixel);i++)
{


Raw_image_data[Data_index]=Raw_image_data[(Scanline-1)*(Width*Components_per_pixel)+i]+IMAGE_DATA[((Scanline)*(Width*Components_per_pixel+1))+1+i];
Data_index++;
}






}




function Average()
{




for(let i=0;i<Components_per_pixel;i++)
{

Raw_image_data[Data_index]=IMAGE_DATA[(Scanline*(Width*Components_per_pixel+1))+1+i]+Math.floor((Raw_image_data[((Scanline-1)*Width*Components_per_pixel)+i])/2);
Data_index++;
}



for(let i=Components_per_pixel;i<(Width*Components_per_pixel);i++)
{


Raw_image_data[Data_index]=IMAGE_DATA[(Scanline*(Width*Components_per_pixel+1))+1+i]+Math.floor((Raw_image_data[(Scanline)*(Width*Components_per_pixel)+i-Components_per_pixel]+Raw_image_data[((Scanline-1)*(Width*Components_per_pixel))+i])/2);
Data_index++;
}







}




function PaethPredictor (a, b, c)
{

// a = left, b = above, c = upper left
let p = a + b - c ; //initial estimate
let pa = Math.abs(p - a); // distances to a, b, c
let pb = Math.abs(p - b);
let pc = Math.abs(p - c);
// return nearest of a,b,c,
// breaking ties in order a,b,c.
if ((pa <= pb) &( pa <= pc )){ return a;}
else{ if (pb <= pc){  return b;}
else {return c;}


}

}


function Paeth()
{





for(let i=0;i<Components_per_pixel;i++)
{

Raw_image_data[Data_index]=IMAGE_DATA[(Scanline*(Width*Components_per_pixel+1))+1+i]+ PaethPredictor(0, Raw_image_data[((Scanline-1)*(Width*Components_per_pixel))+i], 0);
Data_index++;
}



for(let i=Components_per_pixel;i<(Width*Components_per_pixel);i++)
{


Raw_image_data[Data_index]=IMAGE_DATA[(Scanline*(Width*Components_per_pixel+1))+1+i]+ PaethPredictor(Raw_image_data[Data_index-Components_per_pixel], Raw_image_data[(Scanline-1)*(Width*Components_per_pixel)+i], Raw_image_data[((Scanline-1)*(Width*Components_per_pixel))+i-Components_per_pixel]);
Data_index++;
}
}
/********/












const Adjusted_width=(Bit_depth==8)?(Width*Components_per_pixel+1):(Components_per_pixel*((((Width-Remainder)*Bit_depth)/8)+1+Pixel_padding)) ;



for(Scanline=0;Scanline<Height;Scanline++)
{


Filter=IMAGE_DATA[Scanline*Adjusted_width];





switch(Filter)
{

case 0x00 ://None

None();
break;

case 0x01://Sub

Sub();
break;

case 0x2://Up

Up();
break;

case 0x3://Average

Average();
break;

case 0x4://Paeth

Paeth();
break;

default :

break;


}



}

//download(index_file,"AAA_dump_png","text");

}





Defilter();






/*****************
 Defilter
*****************/


/*************
PALETTE TO RGB
**************/



if(Color_type==3)
{

var index=0;
var Raw_image_data_P=new Uint8Array(Height*Width*3);

for(let i=0;i<Height*Width;i++)
{

 Raw_image_data_P[(i*3)]=Palette[((Raw_image_data[index])*3)];
 Raw_image_data_P[(i*3)+1]=Palette[((Raw_image_data[index])*3)+1];
 Raw_image_data_P[(i*3)+2]=Palette[((Raw_image_data[index])*3)+2];
index+=1;
}

Components_per_pixel=3;//changing to 3 cause its RGB

Raw_image_data= Raw_image_data_P;

}




/***************
  DISPLAY CODE
***************/




const imageContainer = {
  height : Height,
  width : Width,
  channels : Components_per_pixel,
  data : Raw_image_data


};

return imageContainer;



}
