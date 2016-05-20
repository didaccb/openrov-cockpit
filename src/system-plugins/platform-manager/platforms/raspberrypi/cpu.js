var Q 			= require( "q" );
var fs 			= require( "fs" );
var path		= require( "path" );

var fopen		= Q.denodeify( fs.open );
var read 		= Q.denodeify( fs.read );
var readFile	= Q.denodeify( fs.readFile );

var ComposeInterface = function( platform )
{
	// Temporary container used for cpu detection and info loading
	var cpu =
	{
		info: {},
		targetCPU: platform.cpu
	};
	
	// Compose the CPU interface object
	return LookupCpuInfo( cpu )
			.then( CheckSupport )
			.then( LoadInterfaceImplementation )
			.then( function( cpu )
			{
				// Success
				return platform;
			} );
};

var LookupCpuInfo = function( cpu )
{
	cpu.info = {};
	
	var GetCpuInfo = require( "./lib/cpuinfo.js" );
	
	return GetCpuInfo()
			.then( function( info )
			{
				// Add revision and serial details to the interface object
				cpu.info.revision 	= info.Revision;
				cpu.info.serial 	= info.Serial;
				
				return cpu;
			} );
}

var CheckSupport = function( cpu )
{
	return readFile( path.resolve( __dirname, "cpu/revisionInfo.json" ) )
			.then( JSON.parse )
			.then( function( json )
			{
				// Lookup cpu details in the raspi json file, based on revision
				var details = json[ cpu.info.revision ];
				
				if( details !== undefined )
				{	
					// Board is supported. Add the retrieved details to the interface object
					for( var prop in details )
					{
						cpu.info[ prop ] = details[ prop ];
					}
					
					// Add the info to the target CPU Interface
					cpu.targetCPU.info = cpu.info;
			
					return cpu;
				}
				else
				{
					throw new Error( "Board doesn't exist in database." );
				}
			} );
};

var LoadInterfaceImplementation = function( cpu )
{
	// Load and apply the interface implementation to the actual CPU interface
	require( "./cpu/setup.js" )( cpu.targetCPU );
	return cpu;
};


module.exports = ComposeInterface;